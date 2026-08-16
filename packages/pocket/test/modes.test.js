// dsh-wdx-pocket 三模式公网隧道测试（named / frp 分发、配置持久化、凭据探测、错误路径）

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createPocketService } from '../lib/service.mjs';
import { findCloudflaredCredential, listNamedTunnelCandidates, startNamedTunnel } from '../lib/tunnel.mjs';

function stubInternals() {
  const calls = [];
  return {
    calls,
    lanIPv4: () => '192.168.1.50',
    encodeQr: async (text) => `data:qr;${text}`,
    createProxy: async ({ port }) => ({ port, close: async () => {} }),
    startTunnel: async ({ port }) => { calls.push(['quick', port]); return { url: 'https://q.trycloudflare.com', kill: () => {} }; },
    startNamedTunnel: async ({ port, tunnelName }) => { calls.push(['named', port, tunnelName]); return { url: 'https://live.example.com', kill: () => {} }; },
    startFrpTunnel: async ({ port }) => { calls.push(['frp', port]); return { url: 'http://m.example.com', kill: () => {} }; },
  };
}

test('三模式分发：startTunnel({mode}) 按模式调用对应实现，status 反映 tunnelMode 与掩码配置', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wdx-modes-'));
  try {
    const internals = stubInternals();
    // home 指向临时目录：防止测试配置写进真实 $DSH_HOME（污染后续测试）
    const service = createPocketService({ dshPort: 3080, port: 3081, home: dir, internals });
    await service.startProxy();

    await service.startTunnel({ mode: 'named', config: { tunnelName: 'live-tunnel', url: 'https://live.example.com' } });
    assert.deepEqual(internals.calls[0], ['named', 3081, 'live-tunnel'], 'named 分发到 startNamedTunnel 且指向代理端口');
    let s = await service.status();
    assert.equal(s.tunnelMode, 'named');
    assert.equal(s.tunnelUrl, 'https://live.example.com');
    assert.equal(s.namedConfig.tunnelName, 'live-tunnel', 'named 配置回显');

    service.stopTunnel();
    await service.startTunnel({ mode: 'frp', config: { serverAddr: '1.2.3.4', token: 'secret' } });
    assert.equal(internals.calls[1][0], 'frp', 'frp 分发到 startFrpTunnel');
    s = await service.status();
    assert.equal(s.tunnelMode, 'frp');
    assert.equal(s.frpConfig.token, '***', 'frp token 掩码回显');
    assert.equal(s.frpConfig.serverAddr, '1.2.3.4');

    service.stopTunnel();
    await service.dispose();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('无参 startTunnel：默认 quick；named 配置持久化后新实例沿用', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wdx-modes-'));
  const prev = process.env.DSH_HOME;
  process.env.DSH_HOME = dir;
  try {
    const internals = stubInternals();
    const service = createPocketService({ dshPort: 3080, port: 3081, internals });
    await service.startProxy();
    await service.startTunnel({ mode: 'named', config: { tunnelName: 't1', url: 'https://t1.example.com' } });
    service.stopTunnel();

    // 模拟重启：新 service 实例，无参 startTunnel 应沿用保存的 named 模式与配置
    const internals2 = stubInternals();
    const service2 = createPocketService({ dshPort: 3080, port: 3081, internals: internals2 });
    await service2.startProxy();
    await service2.startTunnel();
    assert.equal(internals2.calls[0][0], 'named', '无参时沿用上次保存的模式');
    assert.equal(internals2.calls[0][2], 't1', '沿用保存的隧道名');
    await service2.dispose();
  } finally {
    process.env.DSH_HOME = prev;
    await rm(dir, { recursive: true, force: true });
  }
});

test('findCloudflaredCredential / listNamedTunnelCandidates：只读探测凭据目录', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wdx-creds-'));
  await writeFile(join(dir, 'abc.json'), JSON.stringify({ TunnelID: 'abc', TunnelName: 'live-tunnel', TunnelSecret: 's' }));
  await writeFile(join(dir, 'bad.json'), 'not-json');
  try {
    assert.equal(await findCloudflaredCredential(dir, 'live-tunnel'), join(dir, 'abc.json'));
    assert.equal(await findCloudflaredCredential(dir, 'nope'), null, '不存在的隧道返回 null');
    assert.deepEqual(await listNamedTunnelCandidates(dir), [{ name: 'live-tunnel', id: 'abc' }], '坏 JSON 跳过');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('startNamedTunnel：缺隧道名 / 凭据缺失 → 明确报错（不 spawn 进程）', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wdx-named-'));
  try {
    await assert.rejects(startNamedTunnel({ port: 3081, tunnelName: '', home: dir }), /隧道名/, '缺隧道名报中文引导');
    await assert.rejects(
      startNamedTunnel({ port: 3081, tunnelName: 'ghost', credsDir: dir, home: dir }),
      /凭据/,
      '凭据缺失报引导（含隧道名）',
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
