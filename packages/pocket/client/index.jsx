// dsh-wdx-pocket 网页客户端：
//   1. 设置页签「手机访问」（局域网/公网二维码 + 更新/重启提示）
//   2. 移动端适配（移植自 MIT 项目 dsh-web-mobile，见 client/mobile/LICENSE.dsh-web-mobile）
//
// 手机扫码打开的就是电脑上的 dsh web，实时同步；窄屏自动变成抽屉布局。
//
// 注：Web Push 已移除——浏览器推送依赖 Google FCM（Chrome）等境外服务，
// 国内直连被墙，普通用户用不了。专注扫码同屏这一件事。

import { createElement as h, useEffect, useState } from 'react';

import { POCKET_RPC_CHANNEL, POCKET_ENDPOINTS, redactStatus, compareVersions, POCKET_TUNNEL_MODES, POCKET_TUNNEL_MODE_LABELS } from './api.js';
import { mobileApply } from './mobile/mobile-apply.tsx';

const name = 'dsh-wdx-pocket';
const inject = ['slots', 'connection', 'layout', 'locale', 'sessionLogDownload'];

const styles = {
  card: { background: 'var(--dsw-alias-bg-layer-1,#fff)', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', borderRadius: 12, padding: '14px 16px', maxWidth: 480 },
  block: { borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', marginTop: 12, paddingTop: 12 },
  muted: { color: 'var(--dsw-alias-label-tertiary,#8b93a1)', fontSize: 12 },
  code: { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, wordBreak: 'break-all', margin: '4px 0 8px' },
  primary: { font: 'inherit', cursor: 'pointer', border: 'none', background: 'var(--dsw-alias-brand-primary,#4f6ef7)', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13 },
  btn: { font: 'inherit', cursor: 'pointer', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', background: 'var(--dsw-alias-bg-layer-1,#fff)', borderRadius: 8, padding: '6px 14px', fontSize: 13 },
  qr: { width: 220, height: 220, borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', margin: '6px 0' },
  warn: { color: 'var(--dsw-alias-state-warn-primary,#b45309)', fontSize: 12 },
  input: { font: 'inherit', width: '100%', boxSizing: 'border-box', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'inherit', borderRadius: 8, padding: '6px 10px', fontSize: 13, marginTop: 4 },
  label: { fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' },
  select: { font: 'inherit', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'inherit', borderRadius: 8, padding: '6px 10px', fontSize: 13, marginTop: 4, width: '100%' },
};

function PocketSettingsTab({ rpcCall }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [tunnelState, setTunnelState] = useState(null); // 隧道进度 {phase, detail, startedAt}
  const [restartNotice, setRestartNotice] = useState(false); // 重启后提示
  const [updateInfo, setUpdateInfo] = useState(null); // { current, latest, updating, result } | null
  // 公网模式与配置表单（三模式可切换；配置持久化在 host 侧，重启不丢）
  const [mode, setMode] = useState('quick');
  const [modeTouched, setModeTouched] = useState(false); // 用户是否手动切过模式
  const [namedTunnelName, setNamedTunnelName] = useState('');
  const [namedCredsDir, setNamedCredsDir] = useState('');
  const [namedUrl, setNamedUrl] = useState('');
  const [frpServerAddr, setFrpServerAddr] = useState('');
  const [frpServerPort, setFrpServerPort] = useState('7000');
  const [frpToken, setFrpToken] = useState('');
  const [frpCustomDomains, setFrpCustomDomains] = useState('');
  const [frpRemotePort, setFrpRemotePort] = useState('');
  const [frpFrpcPath, setFrpFrpcPath] = useState('');

  const call = async (endpoint, payload) => {
    const res = await rpcCall(endpoint, payload);
    if (!res?.ok) throw new Error(res?.error?.message ?? 'RPC failed');
    return res.value;
  };

  const load = async () => {
    try {
      const s = await call(POCKET_ENDPOINTS.status, {});
      setStatus(s);
      setTunnelState(s.tunnelState ?? null);
      if (s.restartNotice) {
        // 新进程确认起来了：显示一次「已重启」，清掉旧的更新横幅（单状态，不并存），
        // 然后自动刷新页面加载新代码——不用用户手动刷新
        setRestartNotice(true);
        setUpdateInfo(null);
        if (!sessionStorage.getItem('dshp-auto-reloaded')) {
          sessionStorage.setItem('dshp-auto-reloaded', '1');
          setTimeout(() => { try { location.reload(); } catch { /* 忽略 */ } }, 2000);
        }
      }
    } catch { /* 忽略瞬时失败 */ }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  // 每次页面加载清掉自动刷新标记——这样下次重启（更新后）才能再次触发自动刷新
  useEffect(() => {
    try { sessionStorage.removeItem('dshp-auto-reloaded'); } catch { /* 忽略 */ }
  }, []);

  // 版本检测：host 当前版本 vs npm registry latest（registry 带 CORS *）
  // 两种情况显示横幅：① 有新版可更新；② 磁盘已更新但进程还是旧代码（重启生效）
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const v = await call(POCKET_ENDPOINTS.version, {});
        const meta = await (await fetch('https://registry.npmjs.org/dsh-wdx-pocket/latest')).json();
        if (!alive) return;
        const latest = typeof meta?.version === 'string' ? meta.version : null;
        if (latest && v.current && compareVersions(latest, v.current) > 0) {
          setUpdateInfo({ current: v.current, latest, updating: false, result: null });
        } else if (v.current && v.loaded && compareVersions(v.current, v.loaded) > 0) {
          // 已更新未重启：显示「已更新，重启生效」+ 重启按钮
          setUpdateInfo({ current: v.current, latest: v.current, updating: false, result: 'ok', updated: true });
        }
      } catch { /* 网络失败静默 */ }
    })();
    return () => { alive = false; };
  }, []);

  // 重启宿主（更新生效必需：刷新页面不会重载服务端代码）
  const restartPocket = async () => {
    setUpdateInfo((u) => ({ ...u, restarting: true }));
    try {
      // 宿主 500ms 后自杀，RPC 响应可能来不及送达 → 3 秒超时兜底，别让按钮永远卡「重启中…」
      await Promise.race([
        call(POCKET_ENDPOINTS.restart, {}),
        new Promise((_, rej) => setTimeout(() => rej(new Error('restart requested (no reply within 3s)')), 3000)),
      ]);
      setUpdateInfo((u) => ({ ...u, restarting: true, result: 'ok' }));
    } catch (err) {
      // 网络断连/超时同样视为「已请求重启」——旧进程即将退出，等新进程起来后刷新即可
      const msg = String(err?.message ?? '');
      if (/connection|socket|fetch|network|abort|cancelled|ECONN|disconnect|closed|timeout/i.test(msg)) {
        setUpdateInfo((u) => ({ ...u, restarting: true, result: 'ok' }));
        return;
      }
      setUpdateInfo((u) => ({ ...u, restarting: false, result: 'fail', output: err.message }));
    }
  };

  // 一键更新：调宿主 dsh plugin update（成功后宿主自动重启生效，用户只点一次）
  const runUpdate = async () => {
    setUpdateInfo((u) => ({ ...u, updating: true, result: null }));
    try {
      const r = await call(POCKET_ENDPOINTS.update, {});
      setUpdateInfo((u) => ({
        ...u,
        updating: false,
        result: r.ok ? 'ok' : 'fail',
        autoRestart: r.autoRestart === true,
        output: r.output ?? r.error,
      }));
    } catch (err) {
      setUpdateInfo((u) => ({ ...u, updating: false, result: 'fail', output: err.message }));
    }
  };

  const startTunnel = async () => {
    setBusy(true);
    setError(null);
    setTunnelState({ phase: 'starting', detail: '正在开启…', startedAt: Date.now() });
    // 按当前模式组装配置（host 会合并已保存配置并持久化）
    const config = mode === 'named'
      ? {
          tunnelName: namedTunnelName.trim(),
          credsDir: namedCredsDir.trim() || undefined,
          url: namedUrl.trim() || undefined,
        }
      : mode === 'frp'
        ? {
            serverAddr: frpServerAddr.trim(),
            serverPort: Number(frpServerPort) || 7000,
            token: frpToken,
            customDomains: frpCustomDomains.trim(),
            remotePort: frpRemotePort ? Number(frpRemotePort) : undefined,
            frpcPath: frpFrpcPath.trim() || undefined,
          }
        : undefined;
    try {
      setStatus(await call(POCKET_ENDPOINTS.tunnelStart, { mode, config }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const stopTunnel = async () => {
    try { setStatus(await call(POCKET_ENDPOINTS.tunnelStop, {})); } catch { /* 忽略 */ }
  };

  // 状态轮询回来时：同步模式与已保存配置（只在用户未手动改动时预填）
  useEffect(() => {
    if (!status) return;
    if (!modeTouched && status.tunnelMode) setMode(status.tunnelMode);
    if (status.namedConfig) {
      const c = status.namedConfig;
      if (c.tunnelName) setNamedTunnelName(c.tunnelName);
      if (c.credsDir) setNamedCredsDir(c.credsDir);
      if (c.url) setNamedUrl(c.url);
    }
    if (status.frpConfig) {
      const c = status.frpConfig;
      if (c.serverAddr) setFrpServerAddr(c.serverAddr);
      if (c.serverPort) setFrpServerPort(String(c.serverPort));
      if (c.customDomains) setFrpCustomDomains(c.customDomains);
      if (c.remotePort) setFrpRemotePort(String(c.remotePort));
      if (c.frpcPath) setFrpFrpcPath(c.frpcPath);
      // token 被掩码为 ***，不回填；用户重填或留空（留空表示沿用已保存的）
    }
  }, [status]);

  const lanUrl = status?.lanUrl;
  const tunnelUrl = status?.tunnelUrl;
  const tunnelPhase = tunnelState?.phase ?? 'idle';
  const tunnelStarting = ['downloading', 'starting', 'registering'].includes(tunnelPhase);
  const tunnelStateDetail = tunnelState?.detail ?? '';
  const tunnelStateStarted = tunnelState?.startedAt ?? null;

  return h('div', { style: styles.card },
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
      h('div', null,
        h('strong', null, '📱 wdx Pocket · 手机访问 | wdx Pocket · Phone access'),
        h('div', { style: styles.muted }, '手机扫码打开的就是电脑上的这个界面，实时同步 | the phone shows this exact screen, live'),
      ),
      h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary,#8b93a1)', whiteSpace: 'nowrap' } },
        'wdx'),
    ),

    // 重启后提示（进程在后台运行，停止方法）——左侧蓝色色条
    restartNotice ? h('div', { style: { ...styles.block, borderLeft: '4px solid var(--dsw-alias-brand-primary,#4f6ef7)', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)', padding: '10px 12px' } },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
        h('div', { style: { fontWeight: 600, fontSize: 13 } }, '🔄 已重启 | Restarted'),
        h('button', { style: styles.btn, onClick: () => setRestartNotice(false) }, '知道了 | OK'),
      ),
      h('div', { style: styles.muted, marginTop: 4, wordBreak: 'break-all' }, `进程在后台运行（不挂终端）。如需停止：${status?.killHint ?? `lsof -ti :${status?.dshPort ?? 3080} | xargs kill -9`}`),
    ) : null,

    // 更新提示——左侧黄色色条（提示有新版本）；单状态：有更新/更新中/已更新自动重启，不并存
    updateInfo ? h('div', { style: { ...styles.block, borderLeft: '4px solid var(--dsw-alias-state-warn-primary,#b45309)', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)', padding: '10px 12px' } },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
        h('div', { style: { fontWeight: 600, fontSize: 13 } },
          updateInfo.updated
            ? `✅ 已更新 v${updateInfo.current}，重启生效 | Updated — restart to apply`
            : updateInfo.result === 'ok'
              ? (updateInfo.autoRestart ? `✅ 已更新 v${updateInfo.latest}，正在自动重启… | updated — restarting…` : `✅ 已更新 v${updateInfo.latest} | Updated`)
              : `📦 新版本 v${updateInfo.latest} | Update available`),
        updateInfo.result !== 'ok'
          ? h('button', { style: styles.primary, onClick: runUpdate, disabled: updateInfo.updating }, updateInfo.updating ? '更新中…' : `更新到 v${updateInfo.latest} | Update`)
          : updateInfo.autoRestart
            ? h('button', { style: styles.btn, disabled: true }, '正在重启生效… | restarting…')
            : h('button', { style: styles.primary, onClick: restartPocket, disabled: updateInfo.restarting }, updateInfo.restarting ? '重启中…' : '🔄 重启 dsh web 生效 | Restart now'),
      ),
      h('div', { style: styles.muted, marginTop: 4 },
        updateInfo.result === 'ok'
          ? (updateInfo.autoRestart ? '✅ 已更新，正在自动重启生效，请稍候刷新 | updated — restarting automatically, refresh shortly'
            : '✅ 已更新，重启 dsh web 生效 | updated — restart dsh web')
        : updateInfo.result === 'fail' ? `❌ 失败：${updateInfo.output || '未知'}（手动更新：dsh plugin --profile web update dsh-wdx-pocket --latest -w）`
        : `当前 v${updateInfo.current} → 最新 v${updateInfo.latest}`),
    ) : null,

    // 局域网
    h('div', { style: styles.block },
      h('div', { style: { fontWeight: 600, fontSize: 13 } }, '📶 局域网（同一 WiFi）| LAN'),
      lanUrl
        ? h('div', null,
          h('img', { src: status.lanQr, alt: 'LAN QR', style: styles.qr }),
          h('div', { style: styles.code }, lanUrl),
          h('div', { style: styles.muted }, '手机连接同一 WiFi 后扫码即可打开'),
        )
        : h('div', { style: styles.muted }, '代理未就绪… | proxy starting…'),
    ),

    // 公网（三模式：快速隧道 / 命名隧道 / frp，设置页可切换）
    h('div', { style: styles.block },
      h('div', { style: { fontWeight: 600, fontSize: 13 } }, '🌐 公网（人在外面）| Anywhere'),
      tunnelUrl
        ? h('div', null,
          h('img', { src: status.tunnelQr, alt: 'Tunnel QR', style: styles.qr }),
          h('div', { style: styles.code }, tunnelUrl),
          h('div', { style: styles.muted },
            `当前方式：${POCKET_TUNNEL_MODE_LABELS[status.tunnelMode ?? 'quick'] ?? status.tunnelMode ?? 'quick'} · `
            + (status.tunnelMode === 'quick' ? 'URL 每次重启自动换新' : 'URL 固定，请勿公开')),
          h('div', { style: styles.warn, marginTop: 4 }, '🔑 链接已泄露？快速隧道重启即换新；命名/frp 模式 URL 固定，请保持私密 | URL leaked? Restart to rotate quick-tunnel URLs; named/frp URLs are fixed — keep them private'),
          h('button', { style: styles.btn, onClick: stopTunnel }, '关闭公网 | Stop'),
        )
        : h('div', null,
          // 模式选择
          h('div', { style: { marginTop: 8 } },
            h('div', { style: styles.label }, '公网方式 | Tunnel mode'),
            h('select', {
              value: mode,
              onChange: (e) => { setMode(e.target.value); setModeTouched(true); },
              style: styles.select,
            }, (status?.tunnelModes ?? POCKET_TUNNEL_MODES).map((m) =>
              h('option', { key: m, value: m }, POCKET_TUNNEL_MODE_LABELS[m] ?? m))),
          ),
          // 命名隧道配置表单（自动探测 ~/.cloudflared 凭据作候选）
          mode === 'named' ? h('div', { style: { marginTop: 8 } },
            h('div', { style: styles.label }, '隧道名 | Tunnel name'),
            h('input', { style: styles.input, value: namedTunnelName, onChange: (e) => setNamedTunnelName(e.target.value), placeholder: 'live-tunnel', list: 'wdx-named-candidates' }),
            status?.namedCandidates?.length
              ? h('datalist', { id: 'wdx-named-candidates' }, status.namedCandidates.map((c) => h('option', { key: c.name, value: c.name }, `${c.name}（${c.id.slice(0, 8)}…）`)))
              : null,
            h('div', { style: { ...styles.label, marginTop: 8 } }, '凭据目录（默认 ~/.cloudflared）| Credentials dir'),
            h('input', { style: styles.input, value: namedCredsDir, onChange: (e) => setNamedCredsDir(e.target.value), placeholder: 'C:\\Users\\you\\.cloudflared' }),
            h('div', { style: { ...styles.label, marginTop: 8 } }, '公网 URL（二维码内容）| Public URL'),
            h('input', { style: styles.input, value: namedUrl, onChange: (e) => setNamedUrl(e.target.value), placeholder: 'https://live.example.com' }),
            h('div', { style: styles.muted, marginTop: 6 }, '只读引用你的 cloudflared 凭据，绝不修改原有配置 | reads your cloudflared credentials only, never modifies your configs'),
          ) : null,
          // frp 配置表单
          mode === 'frp' ? h('div', { style: { marginTop: 8 } },
            h('div', { style: styles.label }, '服务器地址 | Server address'),
            h('input', { style: styles.input, value: frpServerAddr, onChange: (e) => setFrpServerAddr(e.target.value), placeholder: '123.45.67.89' }),
            h('div', { style: { ...styles.label, marginTop: 8 } }, '服务器端口 | Server port'),
            h('input', { style: styles.input, value: frpServerPort, onChange: (e) => setFrpServerPort(e.target.value), placeholder: '7000' }),
            h('div', { style: { ...styles.label, marginTop: 8 } }, '认证 token | Auth token'),
            h('input', { style: styles.input, type: 'password', value: frpToken, onChange: (e) => setFrpToken(e.target.value), placeholder: '已保存则留空 | leave blank if saved' }),
            h('div', { style: { ...styles.label, marginTop: 8 } }, '自定义域名（逗号分隔，可选）| Custom domains'),
            h('input', { style: styles.input, value: frpCustomDomains, onChange: (e) => setFrpCustomDomains(e.target.value), placeholder: 'm.example.com' }),
            h('div', { style: { ...styles.label, marginTop: 8 } }, '远程端口（可选）| Remote port'),
            h('input', { style: styles.input, value: frpRemotePort, onChange: (e) => setFrpRemotePort(e.target.value), placeholder: '80 / 443 / 8443' }),
            h('div', { style: { ...styles.label, marginTop: 8 } }, 'frpc 路径（可选，默认自动下载）| frpc path'),
            h('input', { style: styles.input, value: frpFrpcPath, onChange: (e) => setFrpFrpcPath(e.target.value), placeholder: 'frpc.exe 绝对路径' }),
            h('div', { style: styles.muted, marginTop: 6 }, 'frp 需服务器端 frps 已运行；配置写入 $DSH_HOME/dsh-wdx-pocket/，不动你的 frpc 配置 | frps must run on your server; config goes to $DSH_HOME/dsh-wdx-pocket/'),
          ) : null,
          h('button', { style: { ...styles.primary, marginTop: 12 }, onClick: startTunnel, disabled: busy || tunnelStarting }, busy ? '开启中…' : '开启公网访问 | Enable anywhere'),
          tunnelStarting
            ? h('div', { style: { marginTop: 8, fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' } },
              `⏳ ${tunnelStateDetail}（已等待 ${Math.floor((Date.now() - (tunnelStateStarted || Date.now())) / 1000)} 秒）…`)
            : tunnelPhase === 'error'
              ? h('div', { style: { marginTop: 8, fontSize: 12, color: 'var(--dsw-alias-state-error-primary,#dc2626)' } },
                `❌ 开启失败：${tunnelStateDetail || '未知错误 | failed'}（可重试；若是代理/VPN 问题见 README 排障）`)
              : h('div', null,
                h('div', { style: styles.warn, marginTop: 8 }, '⚠️ DSH 能执行电脑代码：二维码/URL 就是钥匙，请勿发给别人 | the QR/URL is the key — never share it'),
                h('div', { style: styles.muted, marginTop: 4 }, '快速隧道重启即换新；命名/frp 模式 URL 固定，泄露后请尽快处理 | Quick URLs rotate on restart; named/frp URLs are fixed — act fast if leaked'),
              ),
        ),
    ),

    error ? h('div', { style: { color: 'var(--dsw-alias-state-error-primary,#dc2626)', fontSize: 12, marginTop: 8 } }, `❌ ${error}`) : null,

    // 页面最底部：反馈入口
    h('div', { style: { ...styles.block, textAlign: 'center' } },
      h('a', { href: 'https://github.com/wudexiong/wdx-dsh-plugins/issues', target: '_blank', rel: 'noreferrer', style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)', textDecoration: 'none' } },
        '有问题？欢迎到 GitHub Issues 反馈 🙏 | Questions? Open an issue on GitHub'),
    ),
  );
}

export function apply(ctx) {
  // 移动端适配（dsh-web-mobile 移植）：抽屉布局/触控/安全区，仅窄屏生效
  mobileApply(ctx);

  const rpcCall = (endpoint, payload, signal) =>
    ctx.connection.rpc.call(POCKET_RPC_CHANNEL, endpoint, payload, signal);

  // 设置一级入口（与 通用设置/模型/插件 同级，order 1 = 通用之后、最外层）
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'pocket',
        order: 1,
        label: () => '手机访问',
        inject: () => ({ rpcCall }),
      },
      PocketSettingsTab,
    ),
  );
}

export { name, inject, redactStatus };
