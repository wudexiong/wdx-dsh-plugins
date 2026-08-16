// dsh-wdx-pocket 客户端渲染冒烟测试（esbuild 打包 + react-dom/server 渲染）
//
// 回归保障：曾出现「点击 Cloudflare 隧道卡片 → 设置页空白」——向导 JSX 引用
// 了未定义的 detect 变量（ReferenceError 导致整页崩溃）。本测试直接渲染
// PublicRoutePanel 的三条路线 + 关键分支，任何渲染崩溃都会在此暴露。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);

test('公网向导渲染冒烟：三条路线 + 无域名分支 + 已开启视图均不崩溃', async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const result = await build({
    entryPoints: [join(root, 'client/index.jsx')],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: ['node22'],
    // primitives 不 external（打进 bundle，避免运行时 require 其内部 css）；
    // react 保持 external（由 dsh 客户端模块系统注入）
    external: ['react', 'react/jsx-runtime'],
    loader: { '.css': 'empty' },
    write: false,
    logLevel: 'silent',
  });
  const mod = { exports: {} };
  const factory = new Function('require', 'module', 'exports', 'React',
    result.outputFiles[0].text + '\n;return module.exports;');
  const exported = factory(require, mod, mod.exports, require('react'));
  const { PublicRoutePanel, PocketSettingsTab } = exported;
  assert.equal(typeof PublicRoutePanel, 'function', 'PublicRoutePanel 已导出');
  assert.equal(typeof PocketSettingsTab, 'function', 'PocketSettingsTab 已导出');

  const React = require('react');
  const { renderToString } = require('react-dom/server');
  const h = React.createElement;

  const base = {
    route: null, setRoute: () => {},
    detect: {
      hasCloudflared: true, hasCredentials: true,
      tunnels: [{ name: 'live-tunnel', id: 'abc' }],
      url: 'https://live.example.com',
    },
    namedUrl: '', setNamedUrl: () => {},
    frpServerAddr: '', setFrpServerAddr: () => {},
    frpServerPort: '7000', setFrpServerPort: () => {},
    frpVhostPort: '9527', setFrpVhostPort: () => {},
    frpCustomDomains: '', setFrpCustomDomains: () => {},
    frpGen: null, genFrps: () => {},
    frpTest: null, frpTesting: false, testFrp: () => {},
    frpCopyMode: 'script', setFrpCopyMode: () => {}, frpCopied: false, copyText: () => {},
    startTunnel: () => {}, busy: false, tunnelStarting: false,
    tunnelStateDetail: '', tunnelStateStarted: null, tunnelPhase: 'idle',
    tunnelUrl: null, tunnelQr: null, tunnelMode: null, stopTunnel: () => {},
  };

  // 三条路线分别渲染，必须产出内容（曾因 ReferenceError 崩溃空白）
  for (const route of ['quick', 'named', 'frp']) {
    const html = renderToString(h(PublicRoutePanel, { ...base, route }));
    assert.ok(html.length > 100, `route=${route} 渲染出内容`);
  }

  // 生成后展开（frpGen 非空）：完整脚本分支 + 一行命令分支都必须渲染
  // （回归：props 漏传 frpCopyMode/copyText 曾导致点击「生成」后整页空白）
  const frpGen = {
    command: 'curl -fsSL https://example.com/frps-setup.sh | bash',
    script: '#!/usr/bin/env bash\nTOKEN="t"\nVHOST="9527"\nBIND="7000"\nSUB=""\necho ok\n',
    serverPort: 7000, vhostPort: 9527, tokenMasked: 't…',
  };
  const htmlScript = renderToString(h(PublicRoutePanel, { ...base, route: 'frp', frpGen, frpCopyMode: 'script' }));
  assert.ok(htmlScript.includes('一键复制完整脚本'), '完整脚本分支渲染（含复制按钮）');
  const htmlCommand = renderToString(h(PublicRoutePanel, { ...base, route: 'frp', frpGen, frpCopyMode: 'command' }));
  assert.ok(htmlCommand.includes('复制命令'), '一行命令分支渲染');

  // 无域名分支：显示域名输入框 + Cloudflare 引导
  const htmlNoUrl = renderToString(h(PublicRoutePanel, {
    ...base,
    route: 'named',
    detect: { hasCloudflared: true, hasCredentials: true, tunnels: [{ name: 'live-tunnel', id: 'abc' }], url: null },
  }));
  assert.ok(htmlNoUrl.includes('你的域名'), '无域名时显示域名输入');

  // 已开启视图
  const htmlOn = renderToString(h(PublicRoutePanel, {
    ...base, route: 'quick',
    tunnelUrl: 'https://x.trycloudflare.com', tunnelQr: 'data:qr;x', tunnelMode: 'quick',
  }));
  assert.ok(htmlOn.includes('关闭公网'), '已开启视图渲染');
});
