// dsh-wdx-pocket 向导辅助测试：自动探测 / frps 配置生成 / 服务器连通测试

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  readCloudflaredConfigHostname,
  detectNamedTunnelSetup,
  genFrpsConfig,
  frpsSetupCommand,
  testFrpServer,
} from '../lib/tunnel.mjs';

test('readCloudflaredConfigHostname / detectNamedTunnelSetup：只读解析 config.yml 域名与凭据', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wdx-guide-'));
  await writeFile(join(dir, 'abc.json'), JSON.stringify({ TunnelID: 'abc', TunnelName: 'live-tunnel', TunnelSecret: 's' }));
  await writeFile(join(dir, 'config.yml'), [
    'tunnel: abc',
    `credentials-file: ${join(dir, 'abc.json')}`,
    'ingress:',
    '  - hostname: live.example.com',
    '    service: http://localhost:8080',
    '  - service: http_status:404',
  ].join('\n'));
  try {
    assert.equal(await readCloudflaredConfigHostname(dir), 'live.example.com', '从 config.yml 读域名');
    const det = await detectNamedTunnelSetup(dir);
    assert.equal(det.hasCredentials, true);
    assert.equal(det.tunnels[0].name, 'live-tunnel');
    assert.equal(det.url, 'https://live.example.com', '裸域名自动补 https://');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('readCloudflaredConfigHostname：无 config.yml / 无 hostname → null', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wdx-guide-'));
  try {
    assert.equal(await readCloudflaredConfigHostname(dir), null, '目录不存在返回 null');
    await writeFile(join(dir, 'config.yml'), 'tunnel: abc\n');
    assert.equal(await readCloudflaredConfigHostname(dir), null, '无 hostname 返回 null');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('genFrpsConfig / frpsSetupCommand：固定默认端口 9527 + 子域名参数', () => {
  const toml = genFrpsConfig({ token: 'abc123', serverPort: 7000 });
  assert.ok(toml.includes('bindPort = 7000'), 'bindPort');
  assert.ok(toml.includes('auth.token = "abc123"'), 'token 写入');
  assert.ok(toml.includes('vhostHTTPPort = 9527'), 'vhostHTTPPort 固定默认 9527（不占 80）');

  const cmd = frpsSetupCommand({ token: 'abc123', vhostPort: 9527, bindPort: 7000 });
  assert.ok(cmd.startsWith('curl -fsSL'), '一行 curl 命令');
  assert.ok(cmd.includes('frps-setup.sh'), '指向一键部署脚本');
  assert.ok(cmd.includes('abc123') && cmd.includes('9527') && cmd.includes('7000'), '参数带 token 与端口');

  const cmdSub = frpsSetupCommand({ token: 't', vhostPort: 9527, bindPort: 7000, subdomain: 'm.example.com' });
  assert.ok(cmdSub.endsWith('m.example.com'), '子域名作为第 4 个参数追加');
});

test('testFrpServer：不可达地址返回 ok:false 与中文提示（立即失败不挂起）', async () => {
  const r = await testFrpServer('127.0.0.1', 1, 3000); // 本机端口 1 几乎必拒
  assert.equal(r.ok, false);
  assert.ok(typeof r.error === 'string' && r.error.length > 0, '给出可读错误');
  assert.match(r.error, /端口|连接失败|超时/);
});
