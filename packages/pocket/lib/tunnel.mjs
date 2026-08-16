// cloudflared 快速隧道：把本机代理暴露成公网 https URL
//
// 手机在任何网络都能访问；URL 由 cloudflared 随机分配（每次重启会变）。
// 无密码模式：URL 即钥匙（dsh web 能执行代码，请勿把二维码/URL 发给别人）。

import { spawn, execSync } from 'node:child_process';
import { mkdir, access, chmod, rm, stat, readdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { connect } from 'node:net';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createWriteStream } from 'node:fs';

const QUICK_TUNNEL_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

function platformBinary() {
  const archMap = { x64: 'amd64', arm64: 'arm64' };
  const a = archMap[process.arch] ?? process.arch;
  const os = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux';
  return { os, a, ext: os === 'windows' ? '.exe' : '' };
}

/**
 * cloudflared 下载源（依次尝试）。
 * 官方源在国内直连经常失败（GitHub releases 被墙/不稳定），
 * 后面几个是常见的 GitHub 加速镜像——多源尝试提高国内成功率。
 */
const CLOUDFLARED_MIRRORS = [
  (asset) => `https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`,
  (asset) => `https://ghfast.top/https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`,
  (asset) => `https://gh-proxy.com/https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`,
  (asset) => `https://mirror.ghproxy.com/https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`,
];

function hostOf(url) {
  try { return new URL(url).host; } catch { return url; }
}

async function downloadCloudflared(binPath, signal) {
  const { os, a, ext } = platformBinary();
  // cloudflared 新版发布资产是 .tgz 压缩包（内含 cloudflared 二进制）
  const asset = `cloudflared-${os}-${a}.tgz`;
  const dir = dirname(binPath);
  const tgz = join(dir, `cloudflared.tgz`);
  const fetchSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(90_000)])
    : AbortSignal.timeout(90_000);

  let lastErr = null;
  for (let i = 0; i < CLOUDFLARED_MIRRORS.length; i++) {
    const url = CLOUDFLARED_MIRRORS[i](asset);
    console.log(`⬇️  下载 cloudflared（${i + 1}/${CLOUDFLARED_MIRRORS.length}：${hostOf(url)}）…`);
    try {
      const res = await fetch(url, { signal: fetchSignal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(tgz));
      // 简单校验：空文件/极小文件视为下载失败（可能是镜像返回了错误页）
      const st = await stat(tgz);
      if (st.size < 1024 * 1024) throw new Error(`文件异常小（${st.size} 字节），疑似镜像错误页`);
      lastErr = null;
      break; // 下载成功
    } catch (err) {
      lastErr = err;
      await rm(tgz, { force: true }).catch(() => {}); // 清掉半截文件
      console.warn(`  ⚠️ 源 ${i + 1} 失败：${err?.message ?? err}，尝试下一个…`);
    }
  }
  if (lastErr) {
    throw new Error(
      `cloudflared 下载失败：所有镜像源都不通（最后错误：${lastErr?.message ?? lastErr}）。`
      + `可手动安装后重试：npm i -g cloudflared（装好命令行 cloudflared 即可，无需下载）；`
      + `或开启代理/换网络后重试 | all mirrors failed — install cloudflared manually: npm i -g cloudflared, then retry`,
    );
  }

  // 解压 tar.gz → 目录下的 cloudflared 二进制
  await new Promise((resolve, reject) => {
    const child = spawn('tar', ['-xzf', tgz, '-C', dir], { stdio: 'ignore' });
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`cloudflared 解压失败（code=${code}）`)));
    child.once('error', reject);
  });
  const extracted = join(dir, `cloudflared${ext}`);
  if (os !== 'windows') await chmod(extracted, 0o755);
  // 解压成功就删掉 ~20MB 的 tgz，避免长期占用缓存目录
  await rm(tgz, { force: true }).catch(() => {});
  return extracted;
}

/** PATH 里是否已有 cloudflared。 */
function cloudflaredOnPath() {
  try {
    execSync(process.platform === 'win32' ? 'where cloudflared' : 'command -v cloudflared', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** in-flight 下载（单飞）：并发调用复用同一次，防止交错写入损坏 tgz。 */
let downloading = null;

/**
 * 拿一个可用的 cloudflared 路径。
 * 优先：PATH 已有 → 直接用；否则用持久缓存（$DSH_HOME/dsh-wdx-pocket/cloudflared），
 * 只有缓存缺失才下载——避免每次开启公网都重新下 20MB。
 */
export async function resolveCloudflared({ home, onPhase = () => {}, signal } = {}) {
  if (cloudflaredOnPath()) return 'cloudflared';
  const dshHome = home ?? process.env.DSH_HOME ?? join(homedir(), '.dsh');
  const cacheDir = join(dshHome, 'dsh-wdx-pocket', 'bin');
  const bin = join(cacheDir, `cloudflared${platformBinary().ext}`);
  try {
    await access(bin);
    return bin; // 缓存命中，秒开
  } catch { /* 缓存缺失，下载 */ }
  onPhase('downloading');
  await mkdir(cacheDir, { recursive: true });
  if (!downloading) {
    downloading = downloadCloudflared(bin, signal).finally(() => { downloading = null; });
  }
  return downloading;
}

/**
 * 启动 cloudflared 快速隧道，返回公网 URL。
 * @param {object} opts
 * @param {number} opts.port  本机代理端口
 * @param {string} [opts.home] $DSH_HOME（cloudflared 持久缓存）
 * @param {AbortSignal} [opts.signal]
 * @param {(phase:string)=>void} [opts.onPhase] 进度回调：downloading→starting→registering→ready
 * @returns {Promise<{url:string, kill:()=>void}>}
 */
export async function startQuickTunnel({ port, home, signal, onPhase = () => {} }) {
  const bin = await resolveCloudflared({ home, onPhase, signal });
  onPhase('starting');
  // 强制 HTTP/2（TCP 443）而不是默认的 QUIC（UDP 7844）：
  // 国内网络/部分企业网常屏蔽 UDP 7844，导致 tunnel 报 error 1033（Tunnel error）；
  // HTTP/2 走 443 更稳。若平台未来恢复 QUIC 可达，可去掉 --protocol http2。
  const child = spawn(bin, ['tunnel', '--url', `http://127.0.0.1:${port}`, '--protocol', 'http2', '--no-autoupdate'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // H1：spawn 失败（缓存二进制损坏等）必须接住，否则 uncaughtException 崩宿主
  child.on('error', (err) => {
    cleanup?.();
    onPhase?.('error');
    rejectErr?.(new Error(`cloudflared 启动失败：${err?.message ?? err}（可删除 $DSH_HOME/dsh-wdx-pocket/bin 缓存后重试）`));
  });
  onPhase('registering');

  let cleanup = null;
  let rejectErr = null;
  const url = await new Promise((resolve, reject) => {
    let buf = '';
    const onData = (chunk) => {
      buf += String(chunk);
      const m = buf.match(QUICK_TUNNEL_URL_RE);
      if (m) {
        cleanup();
        onPhase('ready');
        resolve(m[0]);
      }
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`cloudflared 退出（code=${code}）`));
    };
    cleanup = () => {
      child.stdout.off('data', onData);
      child.stderr.off('data', onData);
      child.off('exit', onExit);
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      // M4：摘掉监听后管道不再消费 → 64KB 缓冲填满会阻塞 cloudflared → 继续吞掉输出
      child.stdout.resume();
      child.stderr.resume();
    };
    const onAbort = () => {
      cleanup();
      child.kill();
      reject(new Error('已取消 | cancelled'));
    };
    const timer = setTimeout(() => {
      cleanup();
      child.kill();
      reject(new Error(
        'cloudflared 启动超时（30s）——请检查是否开着代理/VPN（Clash 等 TUN 模式会掐断隧道连接），退出代理后重试 | '
        + 'timeout — if you run a proxy/VPN (Clash etc., TUN mode), it can block the tunnel; quit it and retry',
      ));
    }, 30_000);

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', onExit);
    signal?.addEventListener('abort', onAbort, { once: true });
    rejectErr = reject;
  });

  // M1：隧道进程运行中死亡（崩溃/被杀）→ 通知监听方（service 据此把状态从 ready 打回）
  const exitListeners = new Set();
  child.on('exit', (code) => {
    for (const cb of exitListeners) cb(code);
  });

  return {
    url,
    kill: () => {
      try { child.kill(); } catch { /* 忽略 */ }
    },
    /** 注册「进程已退出」回调，返回取消函数。 */
    onExit: (cb) => {
      exitListeners.add(cb);
      return () => exitListeners.delete(cb);
    },
  };
}

// ---------------------------------------------------------------------------
// 多模式公网隧道（dsh-wdx-pocket v0.2+）
//
// 三种模式，设置页可切换：
//   quick —— cloudflared 快速隧道（trycloudflare，零配置，URL 每次换新）
//   named —— cloudflared 命名隧道（自己的域名走 Cloudflare，URL 固定）
//   frp   —— frp 内网穿透（自有公网服务器 + 自己的域名，国内访问最稳）
//
// 设计约束（面向所有用户）：
//   - 绝不修改用户已有配置（~/.cloudflared/config.yml 等）：named 模式写
//     dsh-pocket 自己的临时配置，只读引用用户凭据；frp 写自己的 toml。
//   - 所有临时文件/缓存写 $DSH_HOME/dsh-wdx-pocket/，绝不写安装目录。
// ---------------------------------------------------------------------------

const NAMED_TUNNEL_READY_RE = /Registered tunnel connection|Connection registered/i;
const FRP_READY_RE = /login to server success|start proxy success/i;

/** 通用隧道进程 runner：spawn → 等待就绪特征输出 → 返回 {kill, onExit}。 */
function spawnTunnelProcess({ bin, args, cwd, readyRe, timeoutMs = 30_000, onPhase = () => {}, signal }) {
  const child = spawn(bin, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  let cleanup = null;
  let rejectErr = null;
  child.on('error', (err) => {
    cleanup?.();
    onPhase?.('error');
    rejectErr?.(new Error(`隧道进程启动失败：${err?.message ?? err}`));
  });
  onPhase('registering');

  const ready = new Promise((resolve, reject) => {
    let buf = '';
    const onData = (chunk) => {
      buf += String(chunk);
      if (buf.length > 65_536) buf = buf.slice(-32_768);
      if (readyRe.test(buf)) {
        cleanup();
        onPhase('ready');
        resolve();
      }
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`隧道进程退出（code=${code}）| tunnel process exited`));
    };
    cleanup = () => {
      child.stdout.off('data', onData);
      child.stderr.off('data', onData);
      child.off('exit', onExit);
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      child.stdout.resume();
      child.stderr.resume();
    };
    const onAbort = () => {
      cleanup();
      try { child.kill(); } catch { /* 忽略 */ }
      reject(new Error('已取消 | cancelled'));
    };
    const timer = setTimeout(() => {
      cleanup();
      try { child.kill(); } catch { /* 忽略 */ }
      reject(new Error(`隧道启动超时（${Math.round(timeoutMs / 1000)}s）——请检查网络/代理后重试 | tunnel start timeout`));
    }, timeoutMs);

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', onExit);
    signal?.addEventListener('abort', onAbort, { once: true });
    rejectErr = reject;
  });

  const exitListeners = new Set();
  child.on('exit', (code) => {
    for (const cb of exitListeners) cb(code);
  });

  return {
    ready,
    kill: () => {
      try { child.kill(); } catch { /* 忽略 */ }
    },
    onExit: (cb) => {
      exitListeners.add(cb);
      return () => exitListeners.delete(cb);
    },
  };
}

/** dsh-pocket 私有运行时目录（$DSH_HOME/dsh-wdx-pocket/）。 */
export function pocketDir(home) {
  return join(home ?? process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'dsh-wdx-pocket');
}

/**
 * 探测 Cloudflare 命名隧道的凭据文件（~/.cloudflared/<id>.json，只读）。
 * 凭据 JSON 含 TunnelName/TunnelID 字段，据此匹配用户填的隧道名。
 */
export async function findCloudflaredCredential(credsDir, tunnelName) {
  const dir = credsDir || join(homedir(), '.cloudflared');
  let files = [];
  try { files = await readdir(dir); } catch { return null; }
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const data = JSON.parse(await readFile(join(dir, f), 'utf8'));
      if (data?.TunnelName === tunnelName || data?.TunnelID === tunnelName) {
        return join(dir, f);
      }
    } catch { /* 坏 JSON 跳过 */ }
  }
  return null;
}

/** 列出本机可用的命名隧道候选（设置页下拉用）。 */
export async function listNamedTunnelCandidates(credsDir) {
  const dir = credsDir || join(homedir(), '.cloudflared');
  let files = [];
  try { files = await readdir(dir); } catch { return []; }
  const out = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const data = JSON.parse(await readFile(join(dir, f), 'utf8'));
      if (data?.TunnelName && data?.TunnelID) out.push({ name: data.TunnelName, id: data.TunnelID });
    } catch { /* 跳过 */ }
  }
  return out;
}

/**
 * 启动 cloudflared 命名隧道（自己的域名走 Cloudflare）。
 * 关键：不改用户的 ~/.cloudflared/config.yml —— 写一份 dsh-pocket 自己的
 * 临时配置（ingress 指向本机代理端口），只读引用用户凭据文件。
 *
 * @param {object} opts
 * @param {number} opts.port        本机代理端口
 * @param {string} opts.tunnelName  隧道名（如 live-tunnel）
 * @param {string} [opts.credsDir]  凭据目录（默认 ~/.cloudflared）
 * @param {string} [opts.url]       公网 URL（如 https://live.example.com）
 * @returns {Promise<{url:string, kill:()=>void, onExit:Function}>}
 */
export async function startNamedTunnel({ port, tunnelName, credsDir, url, home, signal, onPhase = () => {} }) {
  if (!tunnelName) {
    throw new Error('请填写命名隧道名称（如 live-tunnel）。没有命名隧道？先创建：cloudflared tunnel create <名称>，再绑定域名：cloudflared tunnel route dns <名称> <你的域名> | tunnel name required');
  }
  // 先校验凭据再下载二进制：配置错误先报，避免白下载 20MB
  const credFile = await findCloudflaredCredential(credsDir, tunnelName);
  if (!credFile) {
    throw new Error(
      `未在 ${credsDir || join(homedir(), '.cloudflared')} 找到隧道「${tunnelName}」的凭据。`
      + '请确认隧道名正确，或设置页填写正确的凭据目录 | credential not found for tunnel "' + tunnelName + '"',
    );
  }
  const bin = await resolveCloudflared({ home, onPhase, signal });
  onPhase('starting');
  const dir = pocketDir(home);
  await mkdir(dir, { recursive: true });
  const cfgPath = join(dir, `tunnel-${tunnelName.replace(/[^a-zA-Z0-9_-]/g, '_')}.yml`);
  // 单条无 hostname 的 ingress = catch-all：本隧道所有域名请求都转发到本机代理
  await writeFile(
    cfgPath,
    `tunnel: ${tunnelName}\ncredentials-file: ${credFile}\ningress:\n  - service: http://127.0.0.1:${port}\n`,
    'utf8',
  );
  const proc = spawnTunnelProcess({
    bin,
    args: ['tunnel', 'run', '--config', cfgPath, '--no-autoupdate', tunnelName],
    cwd: dir,
    readyRe: NAMED_TUNNEL_READY_RE,
    onPhase,
    signal,
  });
  await proc.ready;
  return {
    url: url || `https://${tunnelName}`,
    kill: proc.kill,
    onExit: proc.onExit,
  };
}

/** frp 镜像下载源（GitHub releases 直连 + 国内加速镜像）。 */
const FRP_MIRRORS = [
  (asset) => `https://github.com/fatedier/frp/releases/download/${asset}`,
  (asset) => `https://ghfast.top/https://github.com/fatedier/frp/releases/download/${asset}`,
  (asset) => `https://gh-proxy.com/https://github.com/fatedier/frp/releases/download/${asset}`,
  (asset) => `https://mirror.ghproxy.com/https://github.com/fatedier/frp/releases/download/${asset}`,
];

/** 递归在目录树里找文件名匹配的文件（frp zip 内二进制在子目录里）。 */
async function findFileRecursive(dir, matcher) {
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return null; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      const found = await findFileRecursive(p, matcher);
      if (found) return found;
    } else if (matcher(e.name)) {
      return p;
    }
  }
  return null;
}

/** 下载并解压 frpc（尽力而为；失败时引导用户手动安装）。 */
async function downloadFrp(binPath, signal) {
  const { os, a, ext } = platformBinary();
  const dir = dirname(binPath);
  // 先试 GitHub API 拿最新版本号；失败用写死的稳定版本兜底
  let ver = '0.61.1';
  try {
    const res = await fetch('https://api.github.com/repos/fatedier/frp/releases/latest', {
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const j = await res.json();
      if (typeof j?.tag_name === 'string') ver = j.tag_name.replace(/^v/, '');
    }
  } catch { /* 网络失败用兜底版本 */ }
  const asset = `frp_${ver}_${os}_${a}.zip`;
  const zip = join(dir, asset);
  const fetchSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(90_000)]) : AbortSignal.timeout(90_000);

  let lastErr = null;
  for (let i = 0; i < FRP_MIRRORS.length; i++) {
    const url = FRP_MIRRORS[i](asset);
    console.log(`⬇️  下载 frpc（${i + 1}/${FRP_MIRRORS.length}：${hostOf(url)}）…`);
    try {
      const res = await fetch(url, { signal: fetchSignal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(zip));
      const st = await stat(zip);
      if (st.size < 1024 * 1024) throw new Error(`文件异常小（${st.size} 字节），疑似镜像错误页`);
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      await rm(zip, { force: true }).catch(() => {});
      console.warn(`  ⚠️ 源 ${i + 1} 失败：${err?.message ?? err}，尝试下一个…`);
    }
  }
  if (lastErr) {
    throw new Error(
      `frpc 下载失败：所有镜像源都不通（最后错误：${lastErr?.message ?? lastErr}）。`
      + '可手动安装：下载 frp 解压后把 frpc 放到 $DSH_HOME/dsh-wdx-pocket/bin/，或在设置页填 frpc 路径 | '
      + 'frpc download failed — install frpc manually and set its path in settings',
    );
  }

  // 解压 zip：Windows 自带 tar（bsdtar）支持 zip；其它平台优先 unzip
  const extractDir = join(dir, 'frp-extract');
  await mkdir(extractDir, { recursive: true });
  try {
    if (os === 'windows') {
      await new Promise((resolve, reject) => {
        const child = spawn('tar', ['-xf', zip, '-C', extractDir], { stdio: 'ignore' });
        child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`解压失败（code=${code}）`)));
        child.once('error', reject);
      });
    } else {
      execSync(`unzip -o -q "${zip}" -d "${extractDir}"`, { stdio: 'ignore' });
    }
    const found = await findFileRecursive(extractDir, (name) => name === `frpc${ext}`);
    if (!found) throw new Error('解压后未找到 frpc 二进制');
    await rm(binPath, { force: true }).catch(() => {});
    await import('node:fs/promises').then(({ copyFile }) => copyFile(found, binPath));
    if (os !== 'windows') await chmod(binPath, 0o755);
  } finally {
    await rm(extractDir, { recursive: true, force: true }).catch(() => {});
    await rm(zip, { force: true }).catch(() => {});
  }
  return binPath;
}

/** frpc 是否已在 PATH。 */
function frpcOnPath() {
  try {
    execSync(process.platform === 'win32' ? 'where frpc' : 'command -v frpc', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** 拿一个可用的 frpc：设置页路径 → PATH → 缓存 → 下载。 */
export async function resolveFrpc({ frpcPath, home, onPhase = () => {}, signal } = {}) {
  if (frpcPath) {
    try { await access(frpcPath); return frpcPath; } catch {
      throw new Error(`设置的 frpc 路径不存在：${frpcPath} | frpc path not found`);
    }
  }
  if (frpcOnPath()) return 'frpc';
  const bin = join(pocketDir(home), 'bin', `frpc${platformBinary().ext}`);
  try {
    await access(bin);
    return bin;
  } catch { /* 缓存缺失，下载 */ }
  onPhase('downloading');
  await mkdir(dirname(bin), { recursive: true });
  return downloadFrp(bin, signal);
}

/** 依据 frp 配置拼一个展示用的公网 URL（http 代理；vhost 端口默认 9527，不占 80）。 */
function buildFrpUrl(frp) {
  const vhost = Number(frp.vhostPort) > 0 ? Number(frp.vhostPort) : DEFAULT_VHOST_PORT;
  const domain = (frp.customDomains || '').split(',')[0]?.trim();
  if (domain) return `http://${domain}:${vhost}`;
  if (frp.serverAddr) return `http://${frp.serverAddr}:${vhost}`;
  return null;
}

/**
 * 启动 frp 内网穿透（自有公网服务器 + 自己的域名）。
 * frpc 配置写入 $DSH_HOME/dsh-wdx-pocket/frpc.toml（绝不碰用户的 frpc 配置）。
 *
 * @param {object} opts
 * @param {number} opts.port  本机代理端口
 * @param {object} opts.frp   { serverAddr, serverPort, token, customDomains, vhostPort, url, frpcPath }
 */
export async function startFrpTunnel({ port, frp = {}, home, signal, onPhase = () => {} }) {
  if (!frp.serverAddr) {
    throw new Error('请填写 frp 服务器地址（serverAddr）| frp server address required');
  }
  const bin = await resolveFrpc({ frpcPath: frp.frpcPath, home, onPhase, signal });
  onPhase('starting');
  const dir = pocketDir(home);
  await mkdir(dir, { recursive: true });
  const tomlPath = join(dir, 'frpc.toml');
  const lines = [
    `serverAddr = ${JSON.stringify(frp.serverAddr)}`,
    `serverPort = ${Number(frp.serverPort) || 7000}`,
  ];
  if (frp.token) lines.push(`auth.token = ${JSON.stringify(frp.token)}`);
  lines.push('[[proxies]]');
  lines.push('name = "dsh-wdx-pocket"');
  lines.push('type = "http"');
  lines.push('localIP = "127.0.0.1"');
  lines.push(`localPort = ${port}`);
  const domains = (frp.customDomains || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (domains.length) {
    lines.push(`customDomains = [${domains.map((d) => JSON.stringify(d)).join(', ')}]`);
  }
  await writeFile(tomlPath, lines.join('\n'), 'utf8');

  const proc = spawnTunnelProcess({
    bin,
    args: ['-c', tomlPath],
    cwd: dir,
    readyRe: FRP_READY_RE,
    onPhase,
    signal,
  });
  await proc.ready;
  return {
    url: frp.url || buildFrpUrl(frp) || `http://${frp.serverAddr}`,
    kill: proc.kill,
    onExit: proc.onExit,
  };
}

// ---------------------------------------------------------------------------
// 自动探测与引导（向导式配置的最小必要信息）
// ---------------------------------------------------------------------------

/**
 * 只读解析 ~/.cloudflared/config.yml 里的 ingress 域名（用户以前绑定的域名）。
 * 绝不修改该文件——只读一行，把"用户已配好的域名"自动带出来，免手填。
 */
export async function readCloudflaredConfigHostname(credsDir) {
  const dir = credsDir || join(homedir(), '.cloudflared');
  let text;
  try { text = await readFile(join(dir, 'config.yml'), 'utf8'); } catch { return null; }
  const re = /^\s*-\s*hostname:\s*(\S+)\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const host = m[1].trim();
    if (host && host !== 'http_status:404') return host;
  }
  return null;
}

/** 归一化域名 → URL（裸域名补 https://）。 */
function toUrl(host) {
  if (!host) return null;
  const h = String(host).trim();
  if (!h) return null;
  return /^https?:\/\//i.test(h) ? h : `https://${h}`;
}

/**
 * 探测命名隧道路线的前置条件（设置页检测清单用，全部只读）。
 * @returns {Promise<{hasCloudflared:boolean, hasCredentials:boolean, tunnels:Array, url:string|null}>}
 */
export async function detectNamedTunnelSetup(credsDir) {
  const hasCloudflared = cloudflaredOnPath();
  const tunnels = await listNamedTunnelCandidates(credsDir);
  const host = await readCloudflaredConfigHostname(credsDir);
  return {
    hasCloudflared,
    hasCredentials: tunnels.length > 0,
    tunnels,
    url: toUrl(host),
  };
}

/**
 * 一键生成 frps 服务器端配置（含随机 token，与 frpc 自动配对）。
 * vhostHTTPPort 默认 9527（固定冷门端口，不占 80；用户可在向导配置）。
 */
export function genFrpsConfig({ token, serverPort = 7000, vhostHttpPort = DEFAULT_VHOST_PORT } = {}) {
  const lines = [
    '# frps 配置（由 dsh-wdx-pocket 一键部署脚本/向导生成）',
    `bindPort = ${Number(serverPort) || 7000}`,
    'auth.method = "token"',
    `auth.token = "${token}"`,
    `vhostHTTPPort = ${Number(vhostHttpPort) > 0 ? Number(vhostHttpPort) : DEFAULT_VHOST_PORT}`,
  ];
  return lines.join('\n') + '\n';
}

/** frps 一键部署脚本（仓库内 deploy/frps-setup.sh）的 raw 地址。 */
export const FRPS_SETUP_SCRIPT_URL =
  'https://raw.githubusercontent.com/wudexiong/wdx-dsh-plugins/main/packages/pocket/deploy/frps-setup.sh';

/**
 * 手机访问端口默认值：固定 9527（好记、冷门，避开 80/443/8080/8888 等常见端口）。
 * 用户可在向导里改成任意端口；部署命令、二维码、URL 全部跟随。
 */
export const DEFAULT_VHOST_PORT = 9527;

/**
 * 生成服务器端一键部署命令（一行）：curl 管道执行 frps-setup.sh，参数自带 token。
 * 端口取自用户配置（默认 9527）；国内 raw 下载失败时可用镜像前缀 ghfast.top/ 替换。
 */
export function frpsSetupCommand({ token, vhostPort, bindPort = 7000, subdomain } = {}) {
  const vhost = Number(vhostPort) > 0 ? Number(vhostPort) : DEFAULT_VHOST_PORT;
  const bind = Number(bindPort) || 7000;
  const sub = subdomain && String(subdomain).trim() ? ` ${String(subdomain).trim()}` : '';
  return `curl -fsSL ${FRPS_SETUP_SCRIPT_URL} | bash -s -- ${token} ${vhost} ${bind}${sub}`;
}

/** 部署脚本模板（包内 deploy/frps-setup.sh，随 npm 包发布）。 */
const FRPS_SETUP_SCRIPT_TEMPLATE = new URL('../deploy/frps-setup.sh', import.meta.url);

/** 读取 frps 部署脚本模板全文（服务器无法在线拉取时，用户复制粘贴用）。 */
export async function readFrpsSetupScript() {
  try {
    return await readFile(FRPS_SETUP_SCRIPT_TEMPLATE, 'utf8');
  } catch {
    return null;
  }
}

/**
 * 生成"参数已内嵌"的完整部署脚本：TOKEN/VHOST/BIND/SUB 直接写死在脚本里，
 * 用户复制全文粘贴到服务器后直接 `bash frps-setup.sh` 即可，无需带参数。
 * @returns {Promise<string|null>}
 */
export async function frpsSetupScript({ token, vhostPort, bindPort = 7000, subdomain } = {}) {
  const tpl = await readFrpsSetupScript();
  if (!tpl) return null;
  const vhost = Number(vhostPort) > 0 ? Number(vhostPort) : DEFAULT_VHOST_PORT;
  const bind = Number(bindPort) || 7000;
  const sub = subdomain && String(subdomain).trim() ? String(subdomain).trim() : '';
  return tpl.split('\n').map((line) => {
    if (/^(TOKEN|VHOST|BIND|SUB)="/.test(line)) {
      const key = line.slice(0, line.indexOf('='));
      const val = key === 'TOKEN' ? String(token ?? '') : key === 'VHOST' ? String(vhost) : key === 'BIND' ? String(bind) : sub;
      return `${key}="${val}"`;
    }
    return line;
  }).join('\n');
}

/**
 * 探测 frp 服务器连通性（TCP 握手）。能连上 = frps 正在运行且端口可达。
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export function testFrpServer(serverAddr, serverPort = 7000, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const port = Number(serverPort) || 7000;
    const sock = connect({ host: String(serverAddr || '').trim(), port });
    const timer = setTimeout(() => {
      sock.destroy();
      resolve({ ok: false, error: `连接超时（${timeoutMs / 1000} 秒）。请确认：① 服务器 IP 正确；② 服务器上 frps 已在运行；③ 防火墙/云安全组已放行 ${port} 端口` });
    }, timeoutMs);
    sock.once('connect', () => {
      clearTimeout(timer);
      sock.destroy();
      resolve({ ok: true });
    });
    sock.once('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: `连接失败：${err?.code ?? err?.message ?? err}。请检查 IP 是否填对、frps 是否运行、防火墙/安全组是否放行 ${port} 端口` });
    });
  });
}
