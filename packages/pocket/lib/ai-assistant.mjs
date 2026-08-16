// dsh-wdx-pocket AI 配置助手
//
// 「🤖 AI 帮我配置」：插件创建一个专用子 agent（新对话），注入"穿透配置专家"
// 提示词，让 AI 自主完成公网穿透配置（frp 服务器部署等），完成后通过专用
// 工具把配置回写插件，设置页自动显示"已就绪"。
//
// 关键接口（DSH 原生）：
//   ctx.agents.create(CreateAgentOptions)  —— 创建子 agent（含 session）
//   CreateAgentOptions.setup(agentCtx)     —— agent 未发布时组合其作用域世界
//   harness.registerTool(agentCtx, tool)   —— 给该 agent 注册专用工具
//   agent.followup(UserMessage)            —— 创建完成后驱动第一轮

import { randomBytes } from 'node:crypto';

export const AI_SECTION_NAME = 'wdx-pocket-ai-assistant';

/** 给配置 agent 注入的"穿透配置专家"提示词。 */
export function aiAssistantPrompt({ route }) {
  return `# dsh-wdx-pocket AI 配置助手

你是 dsh-wdx-pocket（让手机扫码访问电脑上 DeepSeek Harness 的插件）的**公网穿透配置专家**。
当前任务路线：${route === 'frp' ? 'frp（自有服务器穿透）' : String(route)}。

## 你的最终目标
把公网通道配置好，并用专用工具把配置写回插件，让设置页显示"已就绪"，用户即可扫码使用。

## 工作准则（必须遵守）
1. **先探测，后询问**：本机能自动查到的（frp 安装包位置、端口占用、cloudflared 凭据等）绝不问用户。
2. **只问真必须的信息**：frp 路线只需问 ① 服务器公网 IP ② SSH 授权方式。每个问题说明为什么需要、去哪拿。
3. **SSH 授权优先用"一次性公钥"**：本机生成临时密钥对 → 把公钥授权命令给用户粘贴到服务器 → 部署完成后**必须删除该公钥**（一次性权限回收）。若用户坚持用密码：只在本次命令中使用，**绝不写入任何文件**。
4. **只改与穿透相关的配置**：frp（/opt/frp、systemd 服务 frps）、nginx 分流（conf.d 新增文件）。不碰用户其他服务、不重启无关服务。
5. **每步向用户简要汇报**（正在做什么、结果如何）；出错先自查重试，再向用户求助。
6. **全程中文交流**，简洁清晰。

## 配置知识（frp 路线）
- 本机已有 frp 安装包：\`D:\\tools\\deepseek_plugins\\frp-server.tgz\`（linux/amd64 完整包，11.6MB）——优先用它，避免服务器下载。
- 服务器端部署目标：
  - 二进制：\`/opt/frp/frps\`
  - 配置：\`/opt/frp/frps.toml\`：
    \`\`\`toml
    bindPort = 7000
    auth.method = "token"
    auth.token = "<token>"
    vhostHTTPPort = 9527
    \`\`\`
  - systemd 服务 \`/etc/systemd/system/frps.service\`（ExecStart=/opt/frp/frps -c /opt/frp/frps.toml，Restart=on-failure，开机自启）
  - 防火墙放行 7000（通信）与 9527（手机访问）：firewalld 用 firewall-cmd，ufw 用 ufw allow；同时提醒用户云安全组需放行
- 可选子域名分流（用户提供子域名时）：nginx 新增 server 块（listen 80; server_name <子域名>; location / { proxy_pass http://127.0.0.1:9527; 带 WebSocket Upgrade 头 }），nginx -t 校验通过才 reload；提醒用户把子域名 A 记录解析到服务器 IP。80 被 docker-proxy 占用时不要硬配，改用 http://IP:9527。
- 仓库内有一份参考部署脚本：本机 \`D:\\tools\\deepseek_plugins\\wdx-dsh-plugins\\packages\\pocket\\deploy\\frps-setup.sh\`（可读来参考参数与环境适配逻辑，也可直接上传服务器执行——但注意它内部会尝试从 GitHub 镜像下载 frp，若服务器下载不通，应改用你本机已有的安装包 scp 上传）。
- token：优先读 \`$DSH_HOME/dsh-wdx-pocket/config.json\` 里的 frp.token；没有则生成随机 32 位 hex 并用于两端。

## 配置回写（最后一步，必须）
配置成功后调用工具 **pocket_import_config**，参数：
- serverAddr：服务器公网 IP
- serverPort：7000（bindPort）
- vhostPort：9527（手机访问端口）
- customDomains：子域名（可选，无则空）
- tunnelUrl：公网访问地址（如 http://IP:9527 或 http://子域名）
工具返回 ok 后，向用户汇报完成，并提示"回到设置页刷新即可看到已就绪"。

## 完成标准
pocket_import_config 调用成功 + 向用户给出手机访问地址。
`;
}

/**
 * 创建并驱动一个 AI 配置 agent（新对话，侧边栏可见）。
 * @param {object} ctx 插件宿主上下文
 * @param {object} opts { route: 'frp'|'quick'|'named', task: string, service }
 * @returns {Promise<{sessionId:string}>}
 */
export async function createConfigAgent(ctx, { route, task, service }) {
  const agents = ctx.get('agents');
  if (!agents) throw new Error('agents 服务不可用，无法创建 AI 配置对话');
  if (typeof agents.create !== 'function') throw new Error('agents.create 不可用');

  const sessionId = `session-wdxai-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
  const cwd = process.env.PWD || process.cwd?.() || 'D:\\tools\\deepseek_plugins';

  const handle = await agents.create({
    sessionId,
    meta: { cwd, origin: 'subagent' },
    setup(agentCtx) {
      // 注入提示词（注册到 agent 自身作用域）
      const sp = agentCtx.get('systemPrompt');
      if (sp?.section) {
        sp.section({
          name: AI_SECTION_NAME,
          order: 5,
          content: aiAssistantPrompt({ route }),
        });
      }
      // 注册"回写配置"专用工具（仅该 agent 可见）
      try {
        harness.registerTool(agentCtx, {
          name: 'pocket_import_config',
          description:
            '将 AI 配置完成的 frp 穿透参数写回 dsh-wdx-pocket 插件配置（设置页据此显示已就绪）。'
            + '参数：serverAddr 服务器公网IP、serverPort 通信端口、vhostPort 手机访问端口、'
            + 'customDomains 子域名(可选)、tunnelUrl 公网访问地址。',
          schema: {
            type: 'object',
            properties: {
              serverAddr: { type: 'string', description: '服务器公网 IP' },
              serverPort: { type: 'number', description: 'frps 通信端口（默认 7000）' },
              vhostPort: { type: 'number', description: '手机访问端口（默认 9527）' },
              customDomains: { type: 'string', description: '子域名（可选）' },
              tunnelUrl: { type: 'string', description: '公网访问地址（如 http://IP:9527）' },
            },
            required: ['serverAddr'],
          },
          execute: async (args) => {
            await service.applyAiConfig({
              serverAddr: args.serverAddr,
              serverPort: args.serverPort,
              vhostPort: args.vhostPort,
              customDomains: args.customDomains,
              tunnelUrl: args.tunnelUrl,
            });
            return { ok: true, note: '配置已写回 dsh-wdx-pocket，设置页刷新后显示已就绪' };
          },
        });
      } catch (err) {
        console.error('dsh-wdx-pocket: register ai tool failed:', err?.message ?? err);
      }
    },
  });

  // 创建完成后再驱动（setup 只组合，不驱动）
  try {
    handle.agent.followup({
      content: [{ type: 'text', text: task }],
      source: { kind: 'plugin', plugin: 'dsh-wdx-pocket' },
    });
  } catch (err) {
    console.error('dsh-wdx-pocket: ai agent followup failed:', err?.message ?? err);
  }

  return { sessionId };
}
