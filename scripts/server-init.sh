#!/bin/bash
# =============================================================================
# NaviX 新服务器初始化脚本
# 用途：在全新 Ubuntu 服务器上配置安全环境
# 用法：sudo bash server-init.sh
# 更新：2025-12-23 - 移除本地 Skills API，使用 Render.com 代理
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# 配置变量（根据需要修改）
# =============================================================================
APP_USER="navix"                    # 应用运行用户
SSH_PORT="2222"                     # SSH 端口（避免使用 22）
DOMAIN="momodi.moments.top"         # 域名
APP_DIR="/var/www/navix"            # 应用目录
NODE_VERSION="20"                   # Node.js 版本

# Skills API 使用 Render.com 代理，无需本地部署
SKILLS_API_URL="https://skills-api-proxy-1.onrender.com"

# =============================================================================
# 检查 root 权限
# =============================================================================
if [ "$EUID" -ne 0 ]; then
    log_error "请使用 root 权限运行此脚本: sudo bash server-init.sh"
    exit 1
fi

log_info "开始初始化服务器..."

# =============================================================================
# 1. 系统更新
# =============================================================================
log_info "1/9 更新系统包..."
apt update && apt upgrade -y

# =============================================================================
# 2. 安装基础软件
# =============================================================================
log_info "2/9 安装基础软件..."
apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    fail2ban \
    nginx \
    certbot \
    python3-certbot-nginx \
    redis-server

# =============================================================================
# 3. 创建应用用户
# =============================================================================
log_info "3/9 创建应用用户 ${APP_USER}..."
if id "$APP_USER" &>/dev/null; then
    log_warn "用户 ${APP_USER} 已存在，跳过创建"
else
    adduser --disabled-password --gecos "" $APP_USER
    usermod -aG sudo $APP_USER
    log_info "用户 ${APP_USER} 创建成功"
fi

# 创建应用目录
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

# =============================================================================
# 4. 安装 Node.js
# =============================================================================
log_info "4/9 安装 Node.js ${NODE_VERSION}..."
if command -v node &> /dev/null; then
    log_warn "Node.js 已安装: $(node -v)"
else
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
    log_info "Node.js 安装完成: $(node -v)"
fi

# 安装 PM2
npm install -g pm2
log_info "PM2 安装完成"

# =============================================================================
# 5. 配置 SSH 安全
# =============================================================================
log_info "5/9 配置 SSH 安全..."

# 备份原配置
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# 写入新配置
cat > /etc/ssh/sshd_config << EOF
# SSH 安全配置 - NaviX
Port $SSH_PORT
Protocol 2

# 认证
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
MaxAuthTries 3
LoginGraceTime 30

# 安全选项
X11Forwarding no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# 只允许特定用户
AllowUsers $APP_USER

# 超时设置
ClientAliveInterval 300
ClientAliveCountMax 2

# 日志
LogLevel VERBOSE
EOF

log_warn "SSH 配置已更新，端口改为 ${SSH_PORT}"
log_warn "请确保已将公钥添加到 /home/${APP_USER}/.ssh/authorized_keys"

# =============================================================================
# 6. 配置防火墙
# =============================================================================
log_info "6/9 配置防火墙..."
ufw default deny incoming
ufw default allow outgoing
ufw allow $SSH_PORT/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# 启用防火墙（非交互模式）
echo "y" | ufw enable
ufw status verbose
log_info "防火墙配置完成"

# =============================================================================
# 7. 配置 fail2ban
# =============================================================================
log_info "7/9 配置 fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 3
banaction = ufw

[sshd]
enabled = true
port = $SSH_PORT
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 24h
EOF

systemctl enable fail2ban
systemctl restart fail2ban
log_info "fail2ban 配置完成"

# =============================================================================
# 8. 配置 Redis
# =============================================================================
log_info "8/9 配置 Redis..."
# 只监听本地
sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
systemctl enable redis-server
systemctl restart redis-server
log_info "Redis 配置完成"

# =============================================================================
# 9. 配置 Nginx 基础
# =============================================================================
log_info "9/9 配置 Nginx..."
cat > /etc/nginx/sites-available/navix << 'EOF'
# NaviX Nginx 配置
# Skills API 使用 Render.com 代理 (skills-api-proxy-1.onrender.com)，无需本地配置

upstream nextjs {
    server 127.0.0.1:3000;
    keepalive 64;
}

# 限流配置
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

server {
    listen 80;
    server_name _;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # 静态文件
    location /_next/static {
        alias /var/www/navix/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location /images {
        alias /var/www/navix/public/images;
        expires 7d;
        access_log off;
    }

    location /favicon.ico {
        alias /var/www/navix/public/favicon.ico;
        expires 30d;
        access_log off;
    }

    # SSE 流式端点（民宿尽调需要长连接）
    location /api/chat {
        limit_req zone=api_limit burst=20 nodelay;
        limit_conn conn_limit 10;

        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection '';

        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;

        add_header X-Accel-Buffering no;
    }

    # 其他 API
    location /api {
        limit_req zone=api_limit burst=50 nodelay;

        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # 默认
    location / {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/navix /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl enable nginx && systemctl restart nginx
log_info "Nginx 配置完成"

# =============================================================================
# 设置用户 SSH 密钥目录
# =============================================================================
log_info "设置用户 SSH 密钥..."
mkdir -p /home/$APP_USER/.ssh
chmod 700 /home/$APP_USER/.ssh
touch /home/$APP_USER/.ssh/authorized_keys
chmod 600 /home/$APP_USER/.ssh/authorized_keys
chown -R $APP_USER:$APP_USER /home/$APP_USER/.ssh

# =============================================================================
# 完成
# =============================================================================
echo ""
echo "=============================================="
log_info "服务器初始化完成！"
echo "=============================================="
echo ""
echo "重要提示："
echo ""
echo "1. 添加 SSH 公钥到: /home/${APP_USER}/.ssh/authorized_keys"
echo "   echo 'your-public-key' >> /home/${APP_USER}/.ssh/authorized_keys"
echo ""
echo "2. 测试新 SSH 连接（新终端）："
echo "   ssh -p ${SSH_PORT} ${APP_USER}@your-server-ip"
echo ""
echo "3. 确认能登录后，重启 SSH 服务："
echo "   systemctl restart sshd"
echo ""
echo "4. 申请 SSL 证书："
echo "   certbot --nginx -d ${DOMAIN}"
echo ""
echo "5. 部署应用请运行: bash deploy-app.sh"
echo ""
log_warn "请勿关闭当前 SSH 会话，直到确认新配置可用！"
echo "=============================================="
