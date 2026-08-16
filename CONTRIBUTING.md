# 开发约定（Contributing Guidelines）

本仓库的开发硬性规则，违反可能导致构建/运行故障，请务必遵守。

## ⚠️ 文件编码铁律（最高优先级）

**所有文件修改一律使用 write / edit 工具（强制 UTF-8 安全写入）。**

**禁止**使用 PowerShell 的 `Get-Content ... | Set-Content` 管道写文件
（含 `-Encoding utf8`、`-NoNewline` 等变体）。

原因（真实事故，两次）：Windows 中文系统下 `Get-Content` 默认按 GBK 解码
UTF-8 文件，`Set-Content -Encoding utf8` 又写入带 BOM 的 UTF-8，往返产生
**乱码 + BOM + 引号丢失**，直接导致 `dsh web` 启动时
`dsh-app-boot` JSON.parse 失败（`Unexpected token '﻿'`），整个 web profile 无法启动。

### 具体场景

| 场景 | 正确做法 | 错误做法 |
|---|---|---|
| 升版本号 | `edit` 工具单行替换 `"version": "0.x.x"` | `(Get-Content -Raw) -replace ... \| Set-Content` |
| 批量改名/替换 | `edit` 逐个替换，或先读后写 | PowerShell `-replace` 写回文件 |
| 任何文本写盘 | `write` 工具 | PowerShell 文本管道 |

PowerShell 在本仓库仅允许：**只读操作**（查看、git 状态、运行命令、执行程序）。

## 版本号

- 包版本：`packages/pocket/package.json` 的 `version` 字段，用 `edit` 工具修改。
- 功能新增 → minor（如 0.3.x → 0.4.0）；修复 → patch（如 0.4.0 → 0.4.1）。

## 开发流程

```sh
pnpm install            # monorepo 根：安装全部 workspace 依赖
pnpm -r test            # 跑所有包测试（packages/pocket 内 36+ 个测试）
pnpm -r build:client    # 重新打包客户端（改 client/ 后必须执行）
```

提交前必须：
1. 测试全绿（`pnpm -r test` 无 fail）；
2. 客户端改动后重新打包（`pnpm -r build:client`），并确认 `client/client.js` 已更新；
3. 全仓库无 BOM（可用只读命令扫描，但**写文件仍走 write/edit**）。

## 提交规范

约定式提交（Conventional Commits）：

- `feat(pocket): ...` —— 新功能
- `fix(pocket): ...` —— 修复
- `chore(...)` / `docs(...)` / `test(...)` —— 杂项/文档/测试

## 结构速览

```
packages/pocket/            dsh-wdx-pocket 插件包
  lib/                      host 端（tunnel/service/proxy/ai-assistant/web-rpc）
  client/                   web 设置页（index.jsx + api.js + build.mjs）
  deploy/frps-setup.sh      服务器端一键部署脚本（环境自适应）
  test/                     node --test 测试（含渲染冒烟，防"点击空白"类崩溃）
```

## 运行时数据

- 所有运行时配置/缓存写 `$DSH_HOME/dsh-wdx-pocket/`（config.json 等），
  绝不写安装目录、绝不修改用户既有配置（如 `~/.cloudflared/config.yml`）。
- 修改 `~/.cloudflared`、`D:\自启动服务脚本` 等用户既有配置需用户明确同意，且只读引用优先。
