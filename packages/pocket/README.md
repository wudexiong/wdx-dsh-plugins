<p align="center">
  <img src="docs/banner.jpg" alt="wdx Pocket" width="100%">
</p>

<h1 align="center">dsh-wdx-pocket</h1>

<p align="center">
  把 <strong>DeepSeek Harness 装进口袋</strong>：一个包、一个设置页，手机扫二维码就实时看到电脑上的同一个界面——人在外面也能用。
</p>

> 基于 [dsh-pocket](https://github.com/shaobeichen/dsh-pocket)（GPL-2.0）二次开发，由 wdx 维护。

## ✨ 特性

| 特性 | 说明 |
|---|---|
| 📶 局域网扫码 | 装好即用：设置 → 插件 → 手机访问，打开就有局域网二维码，手机连同一 WiFi 扫码即开 |
| 🌐 公网三条路线（向导式） | **快速隧道**（零配置兜底）/ **Cloudflare 隧道**（自有域名，全自动探测）/ **自己的服务器**（frp，一键部署），路线自选、无推荐，能自动的全自动，只问真必须的信息 |
| ⚡ 实时同步 | 流式输出走 WebSocket 全透传——电脑上在输出，手机上同步在滚，可双向操作 |
| 🖥 frp 一键部署 | 一行命令在服务器完成：下载 frp → systemd 服务 → 开机自启 → 放行端口；环境自适应（普通 Nginx / 宝塔面板 / Docker 各走最优路径，全部校验回滚）；支持子域名 80 分流（默认端口 9527，可配置，不占 80） |
| 📱 移动端适配 | 窄屏自动变抽屉布局（移植 dsh-web-mobile，MIT）：侧栏抽屉、会话全宽、状态栏安全区、触控优化 |
| 🧩 零依赖安装 | 一个 npm 包、一个设置页，没有核心/适配器要分开装；无需账号（frp 模式需自备服务器） |
| 🔒 URL 即钥匙 | 无公网 URL 暴露给第三方（局域网模式）；快速隧道每次重启自动换新 |

## 🚀 怎么用

**入口**：安装并重启 `dsh web` 后，打开 **设置**，左侧边栏可见 **「手机访问」** 入口。

**前提**：已装 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh --version` 可用）。

```sh
# 1. 装插件（发布到 npm 后：dsh plugin --profile web add dsh-wdx-pocket -w）
dsh plugin --profile web add <本仓库>/packages/pocket -w

# 2. 重启 dsh web
dsh web
```

### 局域网（同一 WiFi）

设置 → 插件 → **手机访问** → 手机扫「📶 局域网」二维码 → 打开的就是电脑上的 DSH，实时同步。

### 公网（人在外面）—— 向导三步

设置 → 插件 → **手机访问** → 公网区块，按向导走：

1. **选一条路线**（三张卡片，自己选）：
   - 🚀 **快速隧道**：零配置，点开启即用（URL 每次重启换新；国内网络可能无法直连）
   - 🌐 **Cloudflare 隧道**：自动探测本机 `~/.cloudflared` 凭据与 config.yml 域名（只读），识别到就自动填好，直接开启；缺什么显示 ❌ 并告诉你怎么补
   - 🖥 **自己的服务器**：填服务器 IP（唯一必填，控制台可见）→ 点「生成部署命令」→ 复制一行命令到服务器执行 → 「测试连接」→ 开启
2. **（frp 路线）服务器部署命令**：脚本自动完成下载/安装/自启/防火墙/子域名分流；默认访问端口 **9527**（可改），不占 80；填子域名后手机访问 `http://子域名`（无端口）
3. **扫码使用**：任何网络扫公网二维码即可

## ⚠️ 安全（必读）

- **DSH 能执行你电脑上的代码**。二维码/URL 就是钥匙，**请勿把二维码或 URL 发给任何人**
- 命名隧道/frp 模式 URL 固定，等于"钥匙不轮换"——请勿公开链接；后续版本会加访问令牌
- 局域网模式不暴露公网，只有同一网络内的设备能访问
- 适合个人自用；多设备/分享场景后续会加访问令牌

## 🛠 开发

```sh
pnpm install            # 在 monorepo 根执行
pnpm -r test            # 测试（含渲染冒烟：三条路线渲染不崩溃）
node client/build.mjs   # 改 client/ 后重新打包（在 packages/pocket 内）
```

## 🗂 结构

| 文件 | 说明 |
|---|---|
| `lib/tunnel.mjs` | 三模式隧道：快速 / 命名（只读引用凭据，临时配置写 `$DSH_HOME/dsh-wdx-pocket/`）/ frp；自动探测与部署命令生成 |
| `lib/service.mjs` | 服务：代理生命周期、模式分发、配置持久化（`$DSH_HOME/dsh-wdx-pocket/config.json`） |
| `deploy/frps-setup.sh` | frps 服务器端一键部署脚本（环境自适应） |
| `client/` | 设置页「手机访问」+ 向导 UI + 移动端适配（dsh-web-mobile 移植） |

## 🤝 致谢

- 上游：[dsh-pocket](https://github.com/shaobeichen/dsh-pocket)（GPL-2.0）——本项目的功能与架构基础
- 移动端适配移植自 [mexiaosqwq/dsh-web-mobile](https://github.com/mexiaosqwq/dsh-web-mobile)（MIT）
- 公网隧道基于 [cloudflared](https://github.com/cloudflare/cloudflared) 与 [frp](https://github.com/fatedier/frp)

## 📄 License

[GPL-2.0](LICENSE) —— 基于 dsh-pocket 二次开发，修改版同样以 GPL 开源并保留版权声明；
移动端适配部分版权声明保留在 `client/mobile/LICENSE.dsh-web-mobile`。
