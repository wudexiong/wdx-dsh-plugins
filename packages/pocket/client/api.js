// dsh-wdx-pocket 设置页签 RPC 契约（client 与 host 共享）
export const POCKET_RPC_CHANNEL = '/dsh-wdx-pocket';

export const POCKET_ENDPOINTS = Object.freeze({
  status: 'pocket.status',
  tunnelStart: 'tunnel.start',
  tunnelStop: 'tunnel.stop',
  frpGenConfig: 'frp.genConfig',
  frpTest: 'frp.test',
  aiStart: 'ai.start',
  version: 'pocket.version',
  update: 'pocket.update',
  restart: 'pocket.restart',
});

/** 公网隧道模式（顺序即设置页展示顺序，与 host TUNNEL_MODES 一致）。 */
export const POCKET_TUNNEL_MODES = Object.freeze(['quick', 'named', 'frp']);

/** 模式展示标签（设置页选择器用）。 */
export const POCKET_TUNNEL_MODE_LABELS = Object.freeze({
  quick: '快速隧道（零配置）| Quick',
  named: '命名隧道（自有域名）| Named',
  frp: 'frp（自有服务器）| frp',
});

/** 语义化版本比较：a > b 返回正数，相等 0，a < b 负数（数字段 + 预发布后缀）。 */
export function compareVersions(a, b) {
  const pa = String(a).replace(/^[vV]/, '').split('.');
  const pb = String(b).replace(/^[vV]/, '').split('.');
  for (let i = 0; i < 3; i++) {
    const x = parseInt(pa[i], 10) || 0;
    const y = parseInt(pb[i], 10) || 0;
    if (x !== y) return x - y;
  }
  // 数字段相等：无预发布后缀的更新；都有后缀时按段比较（alpha < beta < rc…，
  // 数字段按数值：rc.9 < rc.10）
  const aPre = String(a).replace(/^[vV]/, '').match(/-.*$/)?.[0] ?? '';
  const bPre = String(b).replace(/^[vV]/, '').match(/-.*$/)?.[0] ?? '';
  if (!aPre && !bPre) return 0;
  if (!aPre) return 1;
  if (!bPre) return -1;
  // 逐段比较：数字段按数值、文本段按字典序
  const aParts = aPre.slice(1).split('.');
  const bParts = bPre.slice(1).split('.');
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const ax = aParts[i] ?? '';
    const bx = bParts[i] ?? '';
    if (ax === bx) continue;
    const aNum = /^\d+$/.test(ax);
    const bNum = /^\d+$/.test(bx);
    if (aNum && bNum) return Number(ax) - Number(bx); // 数值比较
    if (aNum) return 1; // 数字段 > 文本段
    if (bNum) return -1;
    return ax < bx ? -1 : 1; // 字典序
  }
  return 0;
}

/** 浏览器可见的状态字段（无敏感信息；含二维码 data URL）。 */
export function redactStatus(s) {
  return {
    proxyRunning: s?.proxyRunning === true,
    proxyPort: s?.proxyPort ?? null,
    lanUrl: s?.lanUrl ?? null,
    lanQr: s?.lanQr ?? null,
    tunnelRunning: s?.tunnelRunning === true,
    tunnelUrl: s?.tunnelUrl ?? null,
    tunnelQr: s?.tunnelQr ?? null,
    tunnelState: s?.tunnelState ?? { phase: 'idle' },
    tunnelMode: s?.tunnelMode ?? null,
    tunnelModes: s?.tunnelModes ?? [...POCKET_TUNNEL_MODES],
    namedConfig: s?.namedConfig ?? null,
    frpConfig: s?.frpConfig ?? null,
    namedCandidates: s?.namedCandidates ?? [],
    detect: s?.detect ?? null,
    dshPort: s?.dshPort ?? null,
  };
}
