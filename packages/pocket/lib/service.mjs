// dsh-wdx-pocket 服务：在 dsh web 进程内跑改头代理 + 公网隧道
//
// - 代理：监听 0.0.0.0:<port>（默认 3081），把入站 Host/Origin 改写成
//   127.0.0.1:<dshPort>（dsh web 实际端口），HTTP + WebSocket 全透传。
//   这样 DSH 的 /api 浏览器信任栅栏永远看到 loopback，局域网/公网都能进，
//   且不需要改 dsh 的任何配置（0.0.0.0 绑定被 dsh 官方禁用）。
// - 隧道：三种公网模式可切换（quick / named / frp），见 tunnel.mjs。
// - 配置：持久化到 $DSH_HOME/dsh-wdx-pocket/config.json（重启 dsh web 不丢）。

import { networkInterfaces, homedir } from 'node:os';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createPocketProxy } from './proxy.mjs';
import {
  startQuickTunnel,
  startNamedTunnel,
  startFrpTunnel,
  listNamedTunnelCandidates,
  detectNamedTunnelSetup,
  genFrpsConfig,
  frpsSetupCommand,
  testFrpServer,
  pocketDir,
} from './tunnel.mjs';

const require = createRequire(import.meta.url);

/** 公网隧道模式（顺序即设置页展示顺序）。 */
export const TUNNEL_MODES = ['quick', 'named', 'frp'];

function configPath(home) {
  return join(pocketDir(home), 'config.json');
}

async function loadConfig(home) {
  try {
    return JSON.parse(await readFile(configPath(home), 'utf8'));
  } catch {
    return {};
  }
}

async function saveConfig(home, cfg) {
  try {
    await mkdir(pocketDir(home), { recursive: true });
    await writeFile(configPath(home), JSON.stringify(cfg, null, 2), 'utf8');
  } catch { /* 配置写失败不致命，静默 */ }
}

/** frp token 等敏感字段不回显（掩码）。 */
function maskedConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return null;
  const out = { ...cfg };
  if (out.token) out.token = '***';
  return out;
}

/** URL → 二维码 data URL（浏览器 <img> 直接显示，全本地不依赖第三方）。 */
export async function qrDataUrl(text, { width = 220, margin = 1 } = {}) {
  const QRCode = require('qrcode');
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin, width, type: 'image/png' });
}

function lanIPv4() {
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return null;
}

/**
 * 创建 Pocket 服务。
 * @param {object} opts
 * @param {number} opts.dshPort   dsh web 实际端口（从 ctx.webServer.port 取）
 * @param {number} [opts.port]    代理端口（默认 3081）
 * @param {object} [opts.internals] 测试注入：createProxy / startTunnel / lanIPv4
 * @returns {PocketService}
 */
export function createPocketService({
  dshPort,
  port = 3081,
  home,
  internals = {},
} = {}) {
  const createProxy = internals.createProxy ?? createPocketProxy;
  const startQuick = internals.startTunnel ?? startQuickTunnel; // 向后兼容：internals.startTunnel 仍是 quick 实现的注入点
  const startNamed = internals.startNamedTunnel ?? startNamedTunnel;
  const startFrp = internals.startFrpTunnel ?? startFrpTunnel;
  const getLan = internals.lanIPv4 ?? lanIPv4;

  /** 内存中的已保存配置（启动时懒加载；startTunnel 时更新并落盘）。 */
  let savedConfig = null;
  async function getSavedConfig() {
    if (savedConfig === null) savedConfig = await loadConfig(home);
    return savedConfig;
  }

  let proxy = null;
  let tunnel = null;
  let tunnelAbort = null;
  /** in-flight 隧道启动（单飞）：并发调用复用同一次，避免 spawn 多个 cloudflared 孤儿进程 */
  let tunnelPromise = null;
  /** 隧道进度：{ phase: idle|downloading|starting|registering|ready|error, detail, startedAt } */
  const tunnelState = { phase: 'idle', detail: '', startedAt: null };
  /** 二维码缓存：URL → data URL promise。status() 每 3 秒轮询一次，不能每次都重新生成（CPU 密集）。 */
  const qrCache = new Map();
  const encodeQr = internals.encodeQr ?? qrDataUrl;
  async function qrCached(text) {
    if (!text) return null;
    if (!qrCache.has(text)) {
      if (qrCache.size >= 8) {
        // 只淘汰最旧一条（隧道 URL 每次重启换新），别殃及稳定的 LAN 二维码
        const oldest = qrCache.keys().next().value;
        qrCache.delete(oldest);
      }
      qrCache.set(text, encodeQr(text).catch(() => null));
    }
    return qrCache.get(text);
  }

  return {
    dshPort,
    /** 启动局域网代理（幂等）。 */
    async startProxy() {
      if (proxy) return proxy;
      proxy = await createProxy({
        port,
        host: '0.0.0.0',
        upstream: { host: '127.0.0.1', port: dshPort },
      });
      return proxy;
    },

    /**
     * 启动公网隧道（幂等；返回公网 URL）。进度写进 tunnelState。并发调用单飞。
     * @param {object} [payload]  { mode?: 'quick'|'named'|'frp', config?: object }
     *    无参时使用上次保存的模式（默认 quick）。配置会持久化，重启不丢。
     */
    async startTunnel(payload = {}) {
      await this.startProxy();
      if (tunnel) return tunnel.url;
      if (tunnelPromise) return tunnelPromise; // 复用 in-flight，防孤儿隧道进程

      // 模式解析 + 配置合并（磁盘保存的 + 本次传入的）并持久化
      const saved = await getSavedConfig();
      const mode = payload?.mode ?? saved.tunnelMode ?? 'quick';
      const modeCfg = { ...(saved[mode] ?? {}), ...(payload?.config ?? {}) };
      if (mode !== 'quick' || payload?.mode || payload?.config) {
        const next = { ...saved, tunnelMode: mode, [mode]: modeCfg };
        savedConfig = next;
        await saveConfig(home, next);
      }

      const controller = new AbortController();
      tunnelAbort = controller;
      tunnelState.startedAt = Date.now();
      const onPhase = (phase) => {
        tunnelState.phase = phase;
        if (phase === 'downloading') tunnelState.detail = '首次下载隧道二进制（约 20MB）| first run downloads tunnel binary (~20MB)';
        else if (phase === 'starting') tunnelState.detail = '启动隧道进程… | starting tunnel…';
        else if (phase === 'registering') tunnelState.detail = mode === 'frp'
          ? '连接 frp 服务器… | connecting to frp server…'
          : '连接 Cloudflare 边缘（通常 5-30 秒）| connecting to Cloudflare edge (usually 5-30s)';
        else if (phase === 'ready') tunnelState.detail = '隧道就绪 | ready';
      };
      tunnelPromise = (async () => {
        try {
          // 按模式分发到对应实现（都返回 {url, kill, onExit}）
          const impl = mode === 'named' ? startNamed
            : mode === 'frp' ? startFrp
            : startQuick;
          const opts = mode === 'named'
            ? { port: proxy.port, tunnelName: modeCfg.tunnelName || '', credsDir: modeCfg.credsDir, url: modeCfg.url, home, signal: controller.signal, onPhase }
            : mode === 'frp'
              ? { port: proxy.port, frp: modeCfg, home, signal: controller.signal, onPhase }
              : { port: proxy.port, home, signal: controller.signal, onPhase };
          const result = await impl(opts);
          // 归一化：契约返回 {url, kill}（字符串也兼容）
          tunnel = typeof result === 'string' ? { url: result, kill: () => {}, onExit: undefined } : result;
          tunnel.mode = mode;
          tunnelState.phase = 'ready';
          // M1：隧道进程运行中死亡（崩溃/被杀）→ 状态打回，别让 UI 永远显示"可用"
          tunnel.onExit?.((code) => {
            if (controller.signal.aborted) return; // 主动停止（stopTunnel）不算故障
            tunnelState.phase = 'error';
            tunnelState.detail = `隧道进程退出（code=${code}）| tunnel process exited`;
          });
          return tunnel.url;
        } catch (err) {
          // stopTunnel 触发的 abort 不算错误：保持 idle，别把状态刷成 error
          if (!controller.signal.aborted) {
            tunnelState.phase = 'error';
            tunnelState.detail = err?.message ?? String(err);
          }
          tunnelState.startedAt = null; // 失败后清掉计时，避免 UI 误显"启动中"
          throw err;
        } finally {
          // 只清自己的引用：stopTunnel 后立即 startTunnel 可能已建了新的 in-flight
          // （tunnelPromise=B），A 的 finally 不能把 B 清掉，否则第三次调用会并发 spawn
          if (tunnelPromise === p) tunnelPromise = null;
        }
      })();
      const p = tunnelPromise;
      return tunnelPromise;
    },

    /** 停止公网隧道（代理保持）。 */
    stopTunnel() {
      tunnelAbort?.abort();
      tunnelAbort = null;
      tunnelPromise = null; // 丢弃已 abort 的 in-flight（其 finally 会再清一次，无害）
      if (tunnel) tunnel.kill();
      tunnel = null;
      tunnelState.phase = 'idle';
      tunnelState.detail = '';
      tunnelState.startedAt = null;
    },

    /** 状态快照（RPC 返回，不含敏感信息；二维码 data URL 本地生成 + 缓存）。 */
    async status() {
      const lan = getLan();
      const proxyPort = proxy?.port ?? null;
      const lanUrl = lan && proxyPort ? `http://${lan}:${proxyPort}` : null;
      const saved = await getSavedConfig();
      return {
        proxyRunning: proxy !== null,
        proxyPort,
        lanUrl,
        lanQr: await qrCached(lanUrl),
        tunnelRunning: tunnel !== null,
        tunnelUrl: tunnel?.url ?? null,
        tunnelQr: await qrCached(tunnel?.url ?? null),
        tunnelState: { ...tunnelState },
        // 三模式：当前模式 + 可用模式 + 已保存配置（敏感字段掩码）+ 本机命名隧道候选
        tunnelMode: tunnel?.mode ?? saved.tunnelMode ?? null,
        tunnelModes: [...TUNNEL_MODES],
        namedConfig: maskedConfig(saved.named),
        frpConfig: maskedConfig(saved.frp),
        namedCandidates: await listNamedTunnelCandidates().catch(() => []),
        // 向导检测清单（全部只读探测，供设置页打勾展示）
        detect: await detectNamedTunnelSetup().catch(() => ({
          hasCloudflared: false, hasCredentials: false, tunnels: [], url: null,
        })),
        dshPort,
      };
    },

    /**
     * 一键生成 frps 服务器端部署配置 + 部署命令（token 自动配对，持久化供 frpc 使用）。
     * @returns {Promise<{toml:string, command:string, serverPort:number, vhostPort:number, tokenMasked:string}>}
     */
    async genFrpsConfig() {
      const saved = await getSavedConfig();
      const frp = saved.frp ?? {};
      const token = frp.token && frp.token !== '***' ? frp.token : randomBytes(16).toString('hex');
      const serverPort = Number(frp.serverPort) || 7000;
      const vhostPort = Number(frp.vhostPort) || 8080;
      const toml = genFrpsConfig({ token, serverPort, vhostHttpPort: vhostPort });
      const command = frpsSetupCommand({ token, vhostPort, bindPort: serverPort });
      const next = { ...saved, frp: { ...frp, token, serverPort, vhostPort } };
      savedConfig = next;
      await saveConfig(home, next);
      return { toml, command, serverPort, vhostPort, tokenMasked: token.slice(0, 4) + '…' };
    },

    /**
     * 测试 frp 服务器连通性（TCP 握手）。
     * @param {object} config { serverAddr, serverPort }
     * @returns {Promise<{ok:boolean, error?:string}>}
     */
    async testFrpServer(config = {}) {
      const saved = await getSavedConfig();
      const merged = { ...(saved.frp ?? {}), ...config };
      return testFrpServer(merged.serverAddr, merged.serverPort);
    },

    /** 停止一切（插件卸载时）。 */
    async dispose() {
      this.stopTunnel();
      if (proxy) {
        const p = proxy;
        proxy = null;
        try { await p.close(); } catch { /* server 已关闭等边缘情况 */ }
      }
    },
  };
}
