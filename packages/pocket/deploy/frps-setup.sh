#!/usr/bin/env bash
# =============================================================================
# dsh-wdx-pocket — frps 一键部署脚本（服务器端）
#
# 用法（在服务器上执行，一行命令由电脑端向导生成）：
#   bash frps-setup.sh <token> [vhostHttpPort] [bindPort] [subdomain]
#
#   <token>         必填：与电脑端自动配对的认证令牌（向导生成命令时自带）
#   vhostHttpPort   可选，默认 9527 —— 手机访问端口（不走 80，避免和主域名服务冲突）
#   bindPort        可选，默认 7000 —— frps 与电脑端通信端口
#   subdomain       可选，如 m.example.com —— 自动配置 80 端口按域名分流，
#                   手机访问 http://m.example.com 不带端口；需把该域名 A 记录解析到本服务器
#
# 自动完成：下载 frp → 安装 /opt/frp → 写 frps.toml → systemd 服务（开机自启）
#         → 放行防火墙 → 子域名分流（自动适配 普通Nginx / 宝塔面板 / Docker 环境）
#
# 安全：所有 nginx 配置先 nginx -t 校验，校验不过立即回滚，绝不破坏现有配置。
# 支持：Ubuntu/Debian/CentOS/Rocky 等主流 Linux（x86_64 / arm64）
# =============================================================================
set -uo pipefail

TOKEN="${1:?用法: bash frps-setup.sh <token> [vhostHttpPort] [bindPort] [subdomain]}"
VHOST="${2:-9527}"
BIND="${3:-7000}"
SUB="${4:-}"

echo "==> dsh-wdx-pocket frps 部署开始（token=${TOKEN:0:4}…, 访问端口=$VHOST, 通信端口=$BIND${SUB:+ , 子域名=$SUB}）"

# ---------- 1. 检测系统/架构 ----------
OS="linux"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) A="amd64" ;;
  aarch64|arm64) A="arm64" ;;
  *) echo "❌ 不支持的架构: $ARCH（目前支持 x86_64 / arm64）"; exit 1 ;;
esac

# ---------- 2. 下载 frp（多镜像源，国内优先走加速） ----------
VER="0.61.1"
ASSET="frp_${VER}_${OS}_${A}.tar.gz"
DEST="/opt/frp"
TMP_TGZ="/tmp/${ASSET}"
FRPS_BIN="${DEST}/frps"

MIRRORS=(
  "https://gh.ddlc.top/https://github.com/fatedier/frp/releases/download/${ASSET}"
  "https://gh-proxy.com/https://github.com/fatedier/frp/releases/download/${ASSET}"
  "https://mirror.ghproxy.com/https://github.com/fatedier/frp/releases/download/${ASSET}"
  "https://github.com/fatedier/frp/releases/download/${ASSET}"
  "https://ghfast.top/https://github.com/fatedier/frp/releases/download/${ASSET}"
  "https://ghproxy.net/https://github.com/fatedier/frp/releases/download/${ASSET}"
)

download() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --connect-timeout 20 --max-time 300 -o "$1" "$2"
  elif command -v wget >/dev/null 2>&1; then
    wget -q --timeout=300 -O "$1" "$2"
  else
    echo "❌ 服务器上没有 curl/wget，请先安装：apt install -y curl 或 yum install -y curl"; exit 1
  fi
}

# ---------- 2.1 已安装则跳过下载（重试不重复下载） ----------
if [ -x "$FRPS_BIN" ]; then
  echo "==> 检测到已安装的 frps（${FRPS_BIN}），跳过下载"
else
  echo "==> 下载 frp ${VER} (${OS}/${A})…"
  OK=0
  for m in "${MIRRORS[@]}"; do
    echo "   ⏳ 尝试源：$(echo "$m" | sed -E 's#https://([^/]+)/.*#\1#')"
    if download "$TMP_TGZ" "$m" 2>/dev/null; then OK=1; break; fi
    echo "   ⚠️ 失败，尝试下一个…"
  done
  if [ "$OK" != "1" ]; then
    echo "❌ 所有镜像都下载失败。手动安装方法（任选其一）："
    echo "   ① 在有网络的电脑上下载：https://github.com/fatedier/frp/releases/download/v${VER}/frp_${VER}_${OS}_${A}.tar.gz"
    echo "      （国内可用加速镜像：https://gh.ddlc.top/https://github.com/fatedier/frp/releases/download/v${VER}/frp_${VER}_${OS}_${A}.tar.gz）"
    echo "      然后上传到服务器并解压：tar -xzf frp_${VER}_${OS}_${A}.tar.gz && cp frp_${VER}_${OS}_${A}/frps /opt/frp/frps && chmod +x /opt/frp/frps && 重新执行本脚本"
    echo "   ② 或开启服务器代理后重试本脚本"
    exit 1
  fi

  # ---------- 3. 解压安装 ----------
  echo "==> 安装到 ${DEST}"
  mkdir -p "$DEST"
  tar -xzf "$TMP_TGZ" -C "$DEST" --strip-components=1 "frp_${VER}_${OS}_${A}/frps"
  rm -f "$TMP_TGZ"
  chmod +x "$FRPS_BIN"
fi

# ---------- 4. 写入 frps.toml ----------
cat > "${DEST}/frps.toml" <<EOF
# frps 配置（由 dsh-wdx-pocket 一键部署脚本生成）
bindPort = ${BIND}
auth.method = "token"
auth.token = "${TOKEN}"
vhostHTTPPort = ${VHOST}
EOF
echo "==> 配置已写入 ${DEST}/frps.toml"

# ---------- 5. systemd 服务 + 开机自启 ----------
if command -v systemctl >/dev/null 2>&1; then
  cat > /etc/systemd/system/frps.service <<EOF
[Unit]
Description=dsh-wdx-pocket frps server
After=network.target

[Service]
Type=simple
ExecStart=${FRPS_BIN} -c ${DEST}/frps.toml
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable frps >/dev/null 2>&1 || true
  systemctl restart frps
  echo "==> 服务 frps 已启动并设为开机自启（systemctl status frps 查看）"
else
  nohup "$FRPS_BIN" -c "${DEST}/frps.toml" > /var/log/frps.log 2>&1 &
  echo "==> frps 已在后台运行（日志 /var/log/frps.log；非 systemd 环境无开机自启）"
fi

# ---------- 6. 放行防火墙端口 ----------
echo "==> 放行端口 ${BIND}（通信）与 ${VHOST}（手机访问）"
if command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --permanent --add-port=${BIND}/tcp >/dev/null 2>&1 || true
  firewall-cmd --permanent --add-port=${VHOST}/tcp >/dev/null 2>&1 || true
  firewall-cmd --reload >/dev/null 2>&1 || true
  echo "   ✅ firewalld 已放行"
elif command -v ufw >/dev/null 2>&1; then
  ufw allow ${BIND}/tcp >/dev/null 2>&1 || true
  ufw allow ${VHOST}/tcp >/dev/null 2>&1 || true
  echo "   ✅ ufw 已放行"
else
  echo "   ⚠️ 未检测到 firewalld/ufw；请确认云厂商「安全组」已放行 ${BIND} 和 ${VHOST} 端口"
fi

# ---------- 7. 子域名 80 分流（环境自适应） ----------
if [ -n "$SUB" ]; then
  echo "==> 配置「${SUB}:80 → frps(:${VHOST})」分流"

  # 7.1 检测 80 端口当前被谁占用
  PORT80_PROC=""
  if command -v ss >/dev/null 2>&1; then
    PORT80_PROC=$(ss -ltnp 2>/dev/null | awk '/:80 /{print $6; exit}')
  elif command -v netstat >/dev/null 2>&1; then
    PORT80_PROC=$(netstat -ltnp 2>/dev/null | awk '/:80 /{print $7; exit}')
  fi

  if echo "$PORT80_PROC" | grep -qi 'docker-proxy'; then
    # ---- Docker 占用 80：物理冲突，无法自动，给指引 ----
    echo "⚠️  80 端口已被 Docker 容器占用（docker-proxy），无法自动分流。两个选择："
    echo "    a) 手机访问 http://本服务器IP:${VHOST}（零配置，端口带上即可）"
    echo "    b) 在你现有的反代（宝塔面板 / Traefik / nginx 容器）里手动加一条规则："
    echo "       将 ${SUB} 转发到 http://127.0.0.1:${VHOST}"
  else
    # ---- 检测面板环境 ----
    PANEL=""
    if [ -d /www/server/panel ]; then PANEL="bt"; fi          # 宝塔 / aaPanel
    if command -v 1pctl >/dev/null 2>&1 || [ -d /opt/1panel ]; then PANEL="1panel"; fi

    NGINX_BIN=""
    if [ "$PANEL" = "bt" ] && [ -x /www/server/nginx/sbin/nginx ]; then
      NGINX_BIN="/www/server/nginx/sbin/nginx"
      BT_VHOST="/www/server/panel/vhost/nginx"
    elif command -v nginx >/dev/null 2>&1; then
      NGINX_BIN="nginx"
    fi

    NginxConf() {  # 生成分流配置（$host/$http_upgrade 为 nginx 变量，需转义）
      cat > "$1" <<EOF
server {
  listen 80;
  server_name ${SUB};
  location / {
    proxy_pass http://127.0.0.1:${VHOST};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Forwarded-For \$remote_addr;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
    }

    if [ -n "$NGINX_BIN" ]; then
      CONF_FILE=""
      if [ "$PANEL" = "bt" ] && [ -d "$BT_VHOST" ]; then
        CONF_FILE="${BT_VHOST}/dsh_wdx_pocket.conf"
      else
        CONF_FILE="/etc/nginx/conf.d/dsh-wdx-pocket.conf"
      fi
      NginxConf "$CONF_FILE"
      if "$NGINX_BIN" -t >/dev/null 2>&1; then
        if command -v systemctl >/dev/null 2>&1; then
          systemctl reload nginx >/dev/null 2>&1 || systemctl restart nginx >/dev/null 2>&1 || true
        else
          "$NGINX_BIN" -s reload >/dev/null 2>&1 || true
        fi
        echo "✅ 分流已配置：http://${SUB} → frps(:${VHOST}) → 电脑（${PANEL:+面板环境：$PANEL}）"
        echo "   请把 ${SUB} 的 A 记录解析到本服务器 IP（DNS 生效后手机直接访问 http://${SUB}）"
      else
        rm -f "$CONF_FILE"
        echo "⚠️  nginx 配置校验失败，已自动回滚（你的现有配置未受影响）。"
        if [ "$PANEL" = "bt" ]; then
          echo "   请改用宝塔面板操作：网站 → 添加站点 ${SUB} → 反向代理 → 目标 http://127.0.0.1:${VHOST}"
        else
          echo "   请手动检查 nginx 配置后重试，或直接用 http://本服务器IP:${VHOST}"
        fi
      fi
    else
      # 无 nginx：面板环境不自动装（避免动面板），普通环境自动安装
      if [ "$PANEL" = "bt" ]; then
        echo "⚠️  检测到宝塔面板但未找到其 nginx，请用面板添加反向代理："
        echo "   网站 → 添加站点 ${SUB} → 反向代理 → 目标 http://127.0.0.1:${VHOST}"
      elif [ "$PANEL" = "1panel" ]; then
        echo "⚠️  检测到 1Panel：请用 1Panel 界面创建网站（反向代理 ${SUB} → http://127.0.0.1:${VHOST}）"
      else
        echo "==> 未检测到 Nginx，尝试自动安装…"
        if command -v apt-get >/dev/null 2>&1; then
          apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq nginx >/dev/null 2>&1 || true
        elif command -v yum >/dev/null 2>&1; then
          yum install -y -q nginx >/dev/null 2>&1 || true
        fi
        if command -v nginx >/dev/null 2>&1; then
          NGINX_BIN="nginx"
          CONF_FILE="/etc/nginx/conf.d/dsh-wdx-pocket.conf"
          NginxConf "$CONF_FILE"
          if "$NGINX_BIN" -t >/dev/null 2>&1; then
            systemctl enable nginx >/dev/null 2>&1 || true
            systemctl reload nginx >/dev/null 2>&1 || systemctl restart nginx >/dev/null 2>&1 || true
            echo "✅ Nginx 已安装并配置：http://${SUB} → frps(:${VHOST})；请把 ${SUB} 的 A 记录解析到本服务器 IP"
          else
            rm -f "$CONF_FILE"
            echo "⚠️  配置校验失败已回滚；请手动配置或使用 http://本服务器IP:${VHOST}"
          fi
        else
          echo "⚠️  Nginx 安装失败；手机访问请用 http://本服务器IP:${VHOST}"
        fi
      fi
    fi
  fi
else
  echo "==> 未提供子域名：手机访问 http://本服务器IP:${VHOST}"
fi

# ---------- 8. 完成 ----------
echo ""
echo "============================================================"
echo "✅ frps 部署完成！"
echo "   手机访问：http://本服务器IP:${VHOST}${SUB:+  或  http://${SUB}（80 无端口）}"
echo "   查看状态：systemctl status frps（或 ps aux | grep frps）"
echo "   电脑端向导：填好服务器 IP 后点「测试连接」→「开启公网访问」"
echo "============================================================"
