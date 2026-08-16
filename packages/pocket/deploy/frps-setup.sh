#!/usr/bin/env bash
# =============================================================================
# dsh-wdx-pocket — frps 一键部署脚本（服务器端）
#
# 用法（在服务器上执行）：
#   bash frps-setup.sh <token> [vhostHttpPort] [bindPort]
#
#   <token>         必填：与电脑端自动配对的认证令牌（向导生成部署命令时自带）
#   vhostHttpPort   可选，默认 8080 —— 手机访问端口（不走 80，避免和主域名服务冲突）
#   bindPort        可选，默认 7000 —— frps 与电脑端通信的端口
#
# 脚本自动完成：下载 frp → 安装到 /opt/frp → 写入 frps.toml →
# 注册 systemd 服务（开机自启）→ 放行防火墙端口 → 打印访问地址。
#
# 支持：Ubuntu/Debian/CentOS/Rocky 等主流 Linux（x86_64 / arm64）
# =============================================================================
set -euo pipefail

TOKEN="${1:?用法: bash frps-setup.sh <token> [vhostHttpPort] [bindPort]}"
VHOST="${2:-8080}"
BIND="${3:-7000}"

echo "==> dsh-wdx-pocket frps 部署开始（token=${TOKEN:0:4}…, vhost=$VHOST, bind=$BIND）"

# ---------- 1. 检测系统/架构 ----------
OS="linux"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) A="amd64" ;;
  aarch64|arm64) A="arm64" ;;
  *) echo "❌ 不支持的架构: $ARCH（目前支持 x86_64 / arm64）"; exit 1 ;;
esac

if command -v systemctl >/dev/null 2>&1; then
  echo "==> 检测到 systemd（将注册为系统服务，开机自启）"
else
  echo "⚠️  未检测到 systemd —— 将只安装 frps 并后台运行（不会开机自启）"
fi

# ---------- 2. 下载 frp（多镜像源，国内直连优先走加速） ----------
VER="0.61.1"
ASSET="frp_${VER}_${OS}_${A}.tar.gz"
DEST="/opt/frp"
TMP_TGZ="/tmp/${ASSET}"
FRPS_BIN="${DEST}/frps"

MIRRORS=(
  "https://github.com/fatedier/frp/releases/download/${ASSET}"
  "https://ghfast.top/https://github.com/fatedier/frp/releases/download/${ASSET}"
  "https://gh-proxy.com/https://github.com/fatedier/frp/releases/download/${ASSET}"
  "https://mirror.ghproxy.com/https://github.com/fatedier/frp/releases/download/${ASSET}"
)

download() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --connect-timeout 15 --max-time 180 -o "$1" "$2"
  elif command -v wget >/dev/null 2>&1; then
    wget -q --timeout=180 -O "$1" "$2"
  else
    echo "❌ 服务器上没有 curl/wget，请先安装：apt install -y curl 或 yum install -y curl"; exit 1
  fi
}

echo "==> 下载 frp ${VER} (${OS}/${A})…"
OK=0
for m in "${MIRRORS[@]}"; do
  if download "$TMP_TGZ" "$m" 2>/dev/null; then OK=1; break; fi
  echo "   ⚠️ 镜像失败，尝试下一个…"
done
if [ "$OK" != "1" ]; then echo "❌ 所有镜像都下载失败，请手动下载 frp 后重试"; exit 1; fi

# ---------- 3. 解压安装 ----------
echo "==> 安装到 ${DEST}"
mkdir -p "$DEST"
tar -xzf "$TMP_TGZ" -C "$DEST" --strip-components=1 "frp_${VER}_${OS}_${A}/frps"
rm -f "$TMP_TGZ"
chmod +x "$FRPS_BIN"

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
echo "==> 放行端口 ${BIND}（frps 通信）与 ${VHOST}（手机访问）"
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

# ---------- 7. 完成 ----------
echo ""
echo "============================================================"
echo "✅ frps 部署完成！"
echo "   通信端口（bindPort）: ${BIND}"
echo "   手机访问端口（vhost）: ${VHOST}"
echo "   电脑端访问地址：http://本服务器IP:${VHOST}"
echo "   （若配置了子域名：把子域名 A 记录解析到本服务器 IP 后，"
echo "     访问 http://子域名:${VHOST}，并在电脑端向导里填写该子域名）"
echo "   查看状态：systemctl status frps（或 ps aux | grep frps）"
echo "============================================================"
