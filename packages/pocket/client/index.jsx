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
const inject = ['slots', 'connection', 'layout', 'locale', 'sessionLogDownload', 'sessions'];

const styles = {
  card: { background: 'var(--dsw-alias-bg-layer-1,#fff)', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', borderRadius: 12, padding: '14px 16px', maxWidth: 480 },
  block: { borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', marginTop: 12, paddingTop: 12 },
  muted: { color: 'var(--dsw-alias-label-tertiary,#8b93a1)', fontSize: 12 },
  code: { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, wordBreak: 'break-all', margin: '4px 0 8px' },
  primary: { font: 'inherit', cursor: 'pointer', border: 'none', background: 'var(--dsw-alias-brand-primary,#4f6ef7)', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13 },
  btn: { font: 'inherit', cursor: 'pointer', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'var(--dsw-alias-label-primary,#1f2937)', borderRadius: 8, padding: '6px 14px', fontSize: 13 },
  qr: { width: 220, height: 220, borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', margin: '6px 0' },
  warn: { color: 'var(--dsw-alias-state-warn-primary,#b45309)', fontSize: 12 },
  input: { font: 'inherit', width: '100%', boxSizing: 'border-box', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'inherit', borderRadius: 8, padding: '6px 10px', fontSize: 13, marginTop: 4 },
  label: { fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' },
  select: { font: 'inherit', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'inherit', borderRadius: 8, padding: '6px 10px', fontSize: 13, marginTop: 4, width: '100%' },
  routeCard: { border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', borderRadius: 10, padding: '10px 12px', marginTop: 8, cursor: 'pointer', background: 'var(--dsw-alias-bg-layer-1,#fff)' },
  routeCardActive: { border: '1px solid var(--dsw-alias-brand-primary,#4f6ef7)', background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)' },
  checkOk: { color: 'var(--dsw-alias-state-success-primary,#16a34a)', fontSize: 12 },
  checkBad: { color: 'var(--dsw-alias-state-error-primary,#dc2626)', fontSize: 12 },
};

/**
 * 公网向导面板（三条路线：快速隧道 / Cloudflare 隧道 / 自己的服务器）。
 * 设计原则：用户自己选路线（无推荐）；能自动的全自动（host 探测），
 * 只问"真必须"的信息，且每项都解释为什么需要、去哪拿。
 * 独立组件：便于渲染冒烟测试覆盖每条路线，防止低级渲染崩溃。
 */
function PublicRoutePanel({
  route, setRoute, detect,
  namedUrl, setNamedUrl,
  frpServerAddr, setFrpServerAddr, frpServerPort, setFrpServerPort,
  frpVhostPort, setFrpVhostPort,
  frpCustomDomains, setFrpCustomDomains,
  frpGen, genFrps, frpTest, frpTesting, testFrp,
  frpCopyMode, setFrpCopyMode, frpCopied, copyText,
  aiStart, aiState,
  startTunnel, busy, tunnelStarting, tunnelStateDetail, tunnelStateStarted, tunnelPhase,
  tunnelUrl, tunnelQr, tunnelMode, stopTunnel,
}) {
  return h('div', null,
    tunnelUrl
      ? h('div', null,
        h('img', { src: tunnelQr, alt: 'Tunnel QR', style: styles.qr }),
        h('div', { style: styles.code }, tunnelUrl),
        h('div', { style: styles.muted },
          `当前方式：${POCKET_TUNNEL_MODE_LABELS[tunnelMode ?? 'quick'] ?? tunnelMode ?? 'quick'} · `
          + (tunnelMode === 'quick' ? 'URL 每次重启自动换新' : 'URL 固定，请勿公开')),
        h('div', { style: styles.warn, marginTop: 4 }, '🔑 链接已泄露？快速隧道重启即换新；命名/frp 模式 URL 固定，请保持私密 | URL leaked? Restart to rotate quick-tunnel URLs; named/frp URLs are fixed — keep them private'),
        h('button', { style: styles.btn, onClick: stopTunnel }, '关闭公网 | Stop'),
      )
      : h('div', null,
        h('div', { style: styles.muted },
          '原理：你的电脑没有公网 IP，手机在外面连不上。穿透 = 找一个「中转站」：电脑主动连上它，手机访问它，它把请求转给你电脑。选一条路即可：| How it works: your PC has no public IP — pick a relay route:'),
        // 路线卡片（自己选，不做推荐）
        h('div', { style: { ...styles.routeCard, ...(route === 'quick' ? styles.routeCardActive : {}) }, onClick: () => setRoute('quick') },
          h('div', { style: { fontWeight: 600, fontSize: 13 } }, '🚀 快速隧道 | Quick tunnel'),
          h('div', { style: styles.muted, marginTop: 2 }, '什么都不用准备，点开启就能用；缺点：国内网络可能打不开 | zero setup; may be blocked in mainland China'),
        ),
        h('div', { style: { ...styles.routeCard, ...(route === 'named' ? styles.routeCardActive : {}) }, onClick: () => setRoute('named') },
          h('div', { style: { fontWeight: 600, fontSize: 13 } }, '🌐 Cloudflare 隧道 | Named tunnel'),
          h('div', { style: styles.muted, marginTop: 2 }, '用自己的域名走 Cloudflare 免费中转；国内能不能通看运气 | your own domain via Cloudflare; China access not guaranteed'),
        ),
        h('div', { style: { ...styles.routeCard, ...(route === 'frp' ? styles.routeCardActive : {}) }, onClick: () => setRoute('frp') },
          h('div', { style: { fontWeight: 600, fontSize: 13 } }, '🖥 自己的服务器 | Your server'),
          h('div', { style: styles.muted, marginTop: 2 }, '最稳，国内全链路直连；需要一台有公网 IP 的服务器（几十块/年那种就行）| most stable; needs a cheap VPS'),
        ),
        // ---- 路线内容：快速隧道（0 填写）----
        route === 'quick' ? h('div', { style: { marginTop: 10 } },
          h('div', { style: styles.muted }, '免费中转，URL 每次开启自动换新（适合临时用/测试）| free relay, URL rotates each start'),
          h('button', { style: { ...styles.primary, marginTop: 10 }, onClick: startTunnel, disabled: busy || tunnelStarting }, busy ? '开启中…' : '开启公网访问 | Enable'),
        ) : null,
        // ---- 路线内容：Cloudflare 隧道（全自动检测，0~1 填写）----
        route === 'named' ? h('div', { style: { marginTop: 10 } },
          h('div', { style: styles.label }, '自动检测 | Auto-detected'),
          h('div', { style: { marginTop: 4 } },
            h('div', { style: detect?.hasCloudflared ? styles.checkOk : styles.checkBad },
              `${detect?.hasCloudflared ? '✅' : '❌'} 电脑已安装 cloudflared${detect?.hasCloudflared ? '' : '（安装：npm i -g cloudflared，或 winget install cloudflared）'}`),
            h('div', { style: { ...(detect?.hasCredentials ? styles.checkOk : styles.checkBad), marginTop: 2 } },
              `${detect?.hasCredentials ? '✅' : '❌'} 找到命名隧道${detect?.hasCredentials ? `：${detect.tunnels.map((t) => t.name).join('、')}` : '（创建：cloudflared tunnel create 隧道名）'}`),
            h('div', { style: { ...(detect?.url ? styles.checkOk : styles.checkBad), marginTop: 2 } },
              `${detect?.url ? '✅' : '❌'} 识别到你的域名${detect?.url ? `：${detect.url}` : '（即绑定在隧道上的域名，Cloudflare 面板 DNS 里能看到）'}`),
          ),
          detect?.url ? null : h('div', { style: { marginTop: 8 } },
            h('div', { style: styles.label }, '你的域名（二维码内容）| Your domain'),
            h('input', { style: styles.input, value: namedUrl, onChange: (e) => setNamedUrl(e.target.value), placeholder: 'https://live.example.com' }),
            h('div', { style: styles.muted, marginTop: 4 },
              '没有？① 打开 Cloudflare 控制台 → 你的域名 → DNS；② 添加记录：类型 CNAME，名称填子域名（如 mobile），目标填你的隧道（xxx.cfargotunnel.com）；或命令行：cloudflared tunnel route dns 隧道名 子域名.你的域名 | no domain? add a CNAME in Cloudflare DNS, or run: cloudflared tunnel route dns <tunnel> <sub.yourdomain.com>'),
          ),
          h('div', { style: styles.muted, marginTop: 6 }, '以上全部自动识别（只读你的 cloudflared 配置，绝不修改）| all auto-detected, read-only'),
          h('button', { style: { ...styles.primary, marginTop: 10 }, onClick: startTunnel, disabled: busy || tunnelStarting || !(detect?.hasCredentials || namedUrl.trim()) }, busy ? '开启中…' : '开启公网访问 | Enable'),
        ) : null,
        // ---- 路线内容：自己的服务器（AI 一键配置 / 手动两步）----
        route === 'frp' ? h('div', { style: { marginTop: 10 } },
          h('div', { style: { ...styles.routeCardActive, padding: '10px 12px', borderRadius: 10 } },
            h('div', { style: { fontWeight: 600, fontSize: 13 } }, '🤖 AI 帮我配置（推荐）| Let AI configure'),
            h('div', { style: styles.muted, marginTop: 2 }, '自动开新对话，AI 引导你完成：只问你服务器 IP 和 SSH 授权方式，其余（上传 frp、部署、nginx 分流、权限清理）全自动 | AI opens a chat and walks you through: you only provide server IP + SSH permission'),
            h('button', { style: { ...styles.primary, marginTop: 8 }, onClick: aiStart, disabled: aiState === 'starting' }, aiState === 'starting' ? '正在打开 AI 对话…' : '🤖 让 AI 帮我配置 | Let AI configure'),
            aiState === 'opened'
              ? h('div', { style: { ...styles.checkOk, marginTop: 6 } }, '✅ 已打开 AI 配置对话（见左侧新会话），按对话里的指引回复即可 | AI chat opened — follow the prompts in the new session')
              : null,
          ),
          h('div', { style: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 } },
            h('div', { style: { flex: 1, borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)' } }),
            h('div', { style: styles.muted }, '或手动配置 | or manual'),
            h('div', { style: { flex: 1, borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)' } }),
          ),
          h('div', { style: styles.label }, '服务器 IP（必填）| Server IP'),
          h('input', { style: styles.input, value: frpServerAddr, onChange: (e) => setFrpServerAddr(e.target.value), placeholder: '123.45.67.89' }),
          h('div', { style: styles.muted, marginTop: 4 }, '就是你云服务器控制台显示的「公网 IP」（买服务器那家的控制台里能看到）| the public IP shown in your cloud console'),
          h('div', { style: { marginTop: 8, display: 'flex', gap: 8 } },
            h('div', { style: { flex: 1 } },
              h('div', { style: styles.label }, '访问端口（手机用）| Access port'),
              h('input', { style: styles.input, value: frpVhostPort, onChange: (e) => setFrpVhostPort(e.target.value), placeholder: '9527' }),
            ),
            h('div', { style: { flex: 1 } },
              h('div', { style: styles.label }, '通信端口 | Control port'),
              h('input', { style: styles.input, value: frpServerPort, onChange: (e) => setFrpServerPort(e.target.value), placeholder: '7000' }),
            ),
          ),
          h('div', { style: styles.muted, marginTop: 4 }, '访问端口默认 9527（好记、冷门，不占 80）；改端口/域名后请重新点「生成部署命令」并在服务器重跑 | default 9527; re-generate the command after changing ports/domain'),
          // 域名输入（可选，放生成按钮前：先填好再生成，生成内容自带子域名）
          h('div', { style: { marginTop: 8 } },
            h('div', { style: styles.label }, '你的域名/子域名（可选）| Your subdomain (optional)'),
            h('input', { style: styles.input, value: frpCustomDomains, onChange: (e) => setFrpCustomDomains(e.target.value), placeholder: 'm.example.com（不填则访问 http://服务器IP:9527）' }),
            h('div', { style: styles.muted, marginTop: 4 },
              '填了之后：把该子域名的 A 记录解析到服务器 IP，部署脚本会自动配置 80 端口分流，手机访问 http://子域名（不带端口；你主域名的 80 服务不受影响）| set an A record to your server IP; the deploy script routes :80 → frps(:9527) automatically, http://sub.domain works portless'),
          ),
          h('div', { style: { marginTop: 8 } },
            frpGen
              ? h('div', null,
                // 方式切换：完整脚本（推荐，不依赖服务器网络） / 一行命令
                h('div', { style: { display: 'flex', gap: 8, marginBottom: 6 } },
                  h('button', { style: frpCopyMode === 'script' ? styles.primary : styles.btn, onClick: () => setFrpCopyMode('script') }, '📋 完整脚本（推荐）'),
                  h('button', { style: frpCopyMode === 'command' ? styles.primary : styles.btn, onClick: () => setFrpCopyMode('command') }, '⚡ 一行命令'),
                ),
                frpCopyMode === 'script' && frpGen.script
                  ? h('div', null,
                    h('div', { style: styles.muted },
                      '① 点「一键复制」→ ② SSH 登录服务器执行 `cat > /opt/frp-setup.sh` 回车 → ③ 粘贴内容 → ④ 按 Ctrl+D 保存 → ⑤ 执行 `bash /opt/frp-setup.sh`（参数已内嵌，无需再填）| copy → cat > /opt/frp-setup.sh → paste → Ctrl+D → bash /opt/frp-setup.sh'),
                    h('pre', { style: { ...styles.code, background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)', padding: 8, borderRadius: 8, whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto', marginTop: 6 } }, frpGen.script),
                    h('button', { style: { ...styles.primary, marginTop: 6 }, onClick: () => copyText(frpGen.script) }, frpCopied ? '✅ 已复制！' : '📋 一键复制完整脚本 | Copy script'),
                  )
                  : h('div', null,
                    h('div', { style: styles.muted }, '服务器能访问 GitHub 时可用：SSH 登录后粘贴这一行 | if your server can reach GitHub, paste this one-liner'),
                    h('pre', { style: { ...styles.code, background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)', padding: 8, borderRadius: 8, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto', marginTop: 6 } }, frpGen.command),
                    h('button', { style: { ...styles.primary, marginTop: 6 }, onClick: () => copyText(frpGen.command) }, frpCopied ? '✅ 已复制！' : '📋 复制命令 | Copy command'),
                  ),
                h('div', { style: styles.muted, marginTop: 6 },
                  '脚本自动：下载 frp → 装成系统服务 → 开机自启 → 放行端口（自动适配普通/宝塔/Docker 环境）；完成后回来点「测试连接」| auto: download frp → systemd → firewall → env-aware; then click Test'),
              )
              : h('button', { style: styles.btn, onClick: genFrps }, '① 生成部署内容 | Generate'),
          ),
          h('div', { style: { marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' } },
            h('button', { style: styles.btn, onClick: testFrp, disabled: frpTesting || !frpServerAddr.trim() }, frpTesting ? '测试中…' : '② 测试连接 | Test'),
            h('button', { style: styles.primary, onClick: startTunnel, disabled: busy || tunnelStarting || !frpServerAddr.trim() }, busy ? '开启中…' : '③ 开启公网访问 | Enable'),
          ),
          frpTest ? h('div', { style: { marginTop: 6, fontSize: 12, color: frpTest.ok ? 'var(--dsw-alias-state-success-primary,#16a34a)' : 'var(--dsw-alias-state-error-primary,#dc2626)' } },
            frpTest.ok ? '✅ 服务器连接成功，可以开启了' : `❌ ${frpTest.error}`,
          ) : null,
        ) : null,
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
  );
}

function PocketSettingsTab({ rpcCall, sessionsOpen }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [tunnelState, setTunnelState] = useState(null); // 隧道进度 {phase, detail, startedAt}
  const [restartNotice, setRestartNotice] = useState(false); // 重启后提示
  const [updateInfo, setUpdateInfo] = useState(null); // { current, latest, updating, result } | null
  // 公网向导状态：路线选择 + 最少必要信息（其余全部自动）
  const [route, setRoute] = useState(null); // null | 'quick' | 'named' | 'frp'
  const [namedTunnelName, setNamedTunnelName] = useState(''); // 自动探测预填
  const [namedUrl, setNamedUrl] = useState(''); // 仅自动识别不到域名时需要填
  const [frpServerAddr, setFrpServerAddr] = useState('');
  const [frpServerPort, setFrpServerPort] = useState('7000');
  const [frpCustomDomains, setFrpCustomDomains] = useState(''); // 可选：自己的子域名
  const [frpVhostPort, setFrpVhostPort] = useState('9527'); // 手机访问端口（固定默认，用户可改）
  const [frpGen, setFrpGen] = useState(null); // 一键生成的部署信息 {script, command, ...}
  const [frpTest, setFrpTest] = useState(null); // 连接测试结果 {ok, error}
  const [frpTesting, setFrpTesting] = useState(false);
  const [frpCopyMode, setFrpCopyMode] = useState('script'); // 展示方式：完整脚本 / 一行命令
  const [frpCopied, setFrpCopied] = useState(false); // 复制成功反馈
  const [aiState, setAiState] = useState('idle'); // AI 配置助手状态：idle|starting|opened|error

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
    // 按所选路线组装最少配置（host 会合并已保存配置并持久化；token 等 host 自动配对）
    const detect = status?.detect;
    const mode = route;
    const config = mode === 'named'
      ? {
          tunnelName: (detect?.tunnels?.[0]?.name) || namedTunnelName.trim() || '',
          url: (detect?.url) || namedUrl.trim() || undefined,
        }
      : mode === 'frp'
        ? {
            serverAddr: frpServerAddr.trim(),
            serverPort: Number(frpServerPort) || 7000,
            vhostPort: frpVhostPort ? Number(frpVhostPort) : undefined,
            customDomains: frpCustomDomains.trim() || undefined,
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

  // 一键生成 frps 服务器端部署配置（token 自动配对并保存在 host；携带当前端口/域名配置）
  const genFrps = async () => {
    try {
      setFrpGen(await call(POCKET_ENDPOINTS.frpGenConfig, {
        config: {
          vhostPort: frpVhostPort ? Number(frpVhostPort) : undefined,
          serverPort: frpServerPort ? Number(frpServerPort) : undefined,
          customDomains: frpCustomDomains.trim() || undefined,
        },
      }));
      setFrpCopied(false);
    } catch (err) { setError(err.message); }
  };

  // 一键复制到剪贴板（clipboard API + 降级方案）
  const copyText = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setFrpCopied(true);
      setTimeout(() => setFrpCopied(false), 2000);
    } catch { /* 复制失败静默 */ }
  };

  // 测试 frp 服务器连通性
  const testFrp = async () => {
    setFrpTesting(true);
    setFrpTest(null);
    try {
      setFrpTest(await call(POCKET_ENDPOINTS.frpTest, {
        config: { serverAddr: frpServerAddr.trim(), serverPort: Number(frpServerPort) || 7000 },
      }));
    } catch (err) {
      setFrpTest({ ok: false, error: err.message });
    } finally {
      setFrpTesting(false);
    }
  };

  // 🤖 AI 帮我配置：创建子 agent 新对话，AI 自主完成公网穿透配置
  const aiStart = async () => {
    setAiState('starting');
    setError(null);
    try {
      const r = await call(POCKET_ENDPOINTS.aiStart, { route: 'frp' });
      setAiState('opened');
      // 侧边栏自动切到新会话（r.sessionId）
      try {
        sessionsOpen?.(r.sessionId);
      } catch { /* 切换失败不影响 */ }
    } catch (err) {
      setAiState('error');
      setError(`AI 配置助手启动失败：${err.message}`);
    }
  };

  // 状态轮询回来时：同步检测结果与已保存配置（只在未手动改动时预填）
  useEffect(() => {
    if (!status) return;
    const detect = status.detect;
    if (detect?.tunnels?.length) setNamedTunnelName((v) => v || detect.tunnels[0].name);
    if (status.namedConfig) {
      const c = status.namedConfig;
      if (c.url) setNamedUrl((v) => v || c.url);
    }
    if (status.frpConfig) {
      const c = status.frpConfig;
      if (c.serverAddr) setFrpServerAddr((v) => v || c.serverAddr);
      if (c.serverPort) setFrpServerPort((v) => v || String(c.serverPort));
      if (c.vhostPort) setFrpVhostPort((v) => v || String(c.vhostPort));
      if (c.customDomains) setFrpCustomDomains((v) => v || c.customDomains);
    }
  }, [status]);

  const lanUrl = status?.lanUrl;
  const tunnelUrl = status?.tunnelUrl;
  const tunnelPhase = tunnelState?.phase ?? 'idle';
  const tunnelStarting = ['downloading', 'starting', 'registering'].includes(tunnelPhase);
  const tunnelStateDetail = tunnelState?.detail ?? '';
  const tunnelStateStarted = tunnelState?.startedAt ?? null;
  // 向导检测清单（host 自动探测：cloudflared/凭据/域名）
  const detect = status?.detect ?? null;

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

    // 公网（向导：快速隧道 / Cloudflare 隧道 / 自己的服务器）
    h('div', { style: styles.block },
      h('div', { style: { fontWeight: 600, fontSize: 13 } }, '🌐 公网（人在外面）| Anywhere'),
      h(PublicRoutePanel, {
        route, setRoute, detect,
        namedUrl, setNamedUrl,
        frpServerAddr, setFrpServerAddr, frpServerPort, setFrpServerPort,
        frpCustomDomains, setFrpCustomDomains,
        frpVhostPort, setFrpVhostPort,
        frpGen, genFrps, frpTest, frpTesting, testFrp,
        frpCopyMode, setFrpCopyMode, frpCopied, copyText,
        aiStart, aiState,
        startTunnel, busy, tunnelStarting, tunnelStateDetail, tunnelStateStarted, tunnelPhase,
        tunnelUrl, tunnelQr: status?.tunnelQr, tunnelMode: status?.tunnelMode, stopTunnel,
      }),
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
        inject: () => ({ rpcCall, sessionsOpen: (id) => ctx.sessions?.open(id) }),
      },
      PocketSettingsTab,
    ),
  );
}

export { name, inject, redactStatus, PocketSettingsTab, PublicRoutePanel };
