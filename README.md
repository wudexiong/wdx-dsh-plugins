# wdx-dsh-plugins

Wdx 的 **DeepSeek Harness 插件生态**（monorepo，pnpm workspace）：一个插件一个包，
每个包独立版本、独立发布到 npm，安装互不影响。

## 插件列表

| 包 | 定位 | 状态 |
|---|---|---|
| [`packages/pocket`](packages/pocket/README.md) → **`wdx-pocket`** | 把 DSH 装进口袋：手机扫码访问电脑上的 DeepSeek Harness（局域网 + 公网，实时同屏，移动端适配） | 开发中 |

## 安装

```sh
dsh plugin --profile web add wdx-pocket -w
```

（`wdx-pocket` 发布到 npm 后可用；当前开发期用本地路径：`dsh plugin --profile web add <本仓库>/packages/pocket -w`）

## 开发

```sh
pnpm install          # 安装全部 workspace 依赖
pnpm -r test          # 跑所有包的测试
pnpm build            # 重新打包所有包的客户端
```

## 约定

- 包名统一 `wdx-` 前缀，仓库名统一 `wdx-dsh-` 前缀；
- 每个包自带 `dsh` 清单（bundle patch / client inject），安装方式与仓库结构无关；
- 运行时配置/缓存一律写 `$DSH_HOME/<包名>/`，绝不写安装目录、绝不改用户既有配置。

## License

各包独立许可声明（源自 dsh-pocket 的包保留 GPL-2.0 与原作者版权声明）。
