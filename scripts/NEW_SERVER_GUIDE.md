# 新服务器部署指南

## 概述

本指南用于在全新 Ubuntu 服务器上安全部署 NaviX 应用。

**注意**：Skills API 已部署在 Render.com (`skills-api-proxy-1.onrender.com`)，新服务器无需本地部署。

## 文件说明

| 文件 | 用途 |
|------|------|
| `server-init.sh` | 服务器初始化、安全配置（9 步） |
| `deploy-app.sh` | 部署 Next.js 应用 |
| `env.backup.txt` | 环境变量备份（需更换密钥） |

## 部署步骤

### 第一步：购买新服务器

推荐配置：
- 系统：Ubuntu 20.04/22.04 LTS
- CPU：2 核+
- 内存：4GB+
- 磁盘：40GB+

### 第二步：初始化服务器

```bash
# 1. 用 root 登录新服务器
ssh root@新服务器IP

# 2. 下载初始化脚本
wget https://raw.githubusercontent.com/your-repo/navix/main/scripts/server-init.sh

# 3. 运行初始化
chmod +x server-init.sh
sudo bash server-init.sh
```

### 第三步：配置 SSH 密钥

```bash
# 在本地生成新的 SSH 密钥对（推荐）
ssh-keygen -t ed25519 -C "navix-server" -f ~/.ssh/navix_key

# 将公钥添加到服务器
cat ~/.ssh/navix_key.pub | ssh root@新服务器IP "cat >> /home/navix/.ssh/authorized_keys"

# 测试新连接（使用新端口 2222）
ssh -p 2222 -i ~/.ssh/navix_key navix@新服务器IP
```

### 第四步：上传代码

```bash
# 在服务器上
su - navix
cd /var/www/navix

# 方式一：Git 克隆
git clone https://github.com/your-org/navix.git .

# 方式二：SCP 上传
# （在本地执行）
scp -P 2222 -r /path/to/navix/* navix@新服务器IP:/var/www/navix/
```

### 第五步：配置环境变量

```bash
# 在服务器上
cd /var/www/navix

# 创建 .env.local（使用新的 API 密钥！）
cat > .env.local << 'EOF'
# 必需配置
OPENAI_API_KEY=新的密钥
OPENAI_BASE_URL=https://llm.moments.top/v1
TAVILY_API_KEY=新的密钥

# Anthropic
ANTHROPIC_API_KEY=新的密钥
ANTHROPIC_BASE_URL=https://llm.moments.top/v1
DEEPSEEK_API_KEY=新的密钥

# Skills API
SKILLS_API_URL=https://skills-api-proxy-1.onrender.com

# Supabase（这些是公开的，可以保留）
NEXT_PUBLIC_SUPABASE_URL=https://fpweejynoojdusabuzsb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Redis
USE_LOCAL_REDIS=true
LOCAL_REDIS_URL=redis://localhost:6379

# 阿里云短信（建议更换）
ALIYUN_SMS_ACCESS_KEY_ID=新的密钥
ALIYUN_SMS_ACCESS_KEY_SECRET=新的密钥
ALIYUN_SMS_SIGN_NAME=莫曼茨智能科技上海
ALIYUN_SMS_TEMPLATE_CODE=SMS_328436998
EOF
```

### 第六步：部署应用

```bash
# 部署 Next.js
cd /var/www/navix
bash scripts/deploy-app.sh
```

> **注意**：Skills API 无需本地部署，已通过 Render.com 代理 (`skills-api-proxy-1.onrender.com`)

### 第七步：配置 SSL

```bash
# 确保域名已指向新服务器 IP
# 然后申请 SSL 证书
sudo certbot --nginx -d momodi.moments.top
```

### 第八步：验证

```bash
# 检查服务状态
pm2 list
systemctl status nginx
redis-cli ping

# 测试网站
curl -I https://momodi.moments.top
```

## 安全配置清单

初始化脚本会自动配置以下安全措施：

- [x] 创建非 root 应用用户
- [x] 禁止 root SSH 登录
- [x] 禁用密码登录
- [x] SSH 端口改为 2222
- [x] UFW 防火墙（只开放 80, 443, 2222）
- [x] fail2ban 入侵防护
- [x] Nginx 限流配置
- [x] Redis 只监听本地

## 需要更换的密钥

⚠️ **重要**：以下密钥可能在旧服务器上被泄露，必须更换：

| 密钥 | 更换位置 |
|------|----------|
| `OPENAI_API_KEY` | [OpenAI Dashboard](https://platform.openai.com/api-keys) |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) |
| `TAVILY_API_KEY` | [Tavily Dashboard](https://tavily.com/) |
| `DEEPSEEK_API_KEY` | [DeepSeek Platform](https://platform.deepseek.com/) |
| `ALIYUN_SMS_*` | [阿里云 RAM](https://ram.console.aliyun.com/) |
| SSH 密钥 | 本地重新生成 |

## 新旧服务器架构对比

| 项目 | 旧配置 | 新配置 |
|------|--------|--------|
| 运行用户 | root | navix |
| SSH 端口 | 22 | 2222 |
| Root 登录 | 允许 | 禁止 |
| 密码登录 | 禁用 | 禁用 |
| 入侵防护 | 无 | fail2ban |
| 限流 | 无 | Nginx rate limiting |

## 故障排查

### SSH 连接失败
```bash
# 检查 UFW 是否开放端口
sudo ufw status

# 检查 SSH 服务状态
sudo systemctl status sshd
```

### Next.js 启动失败
```bash
# 查看日志
pm2 logs navix

# 检查端口占用
lsof -i :3000
```

### Nginx 502 错误
```bash
# 检查 Next.js 是否运行
pm2 list

# 检查 Nginx 错误日志
tail -f /var/log/nginx/error.log
```

## 联系支持

如有问题，请检查日志或联系运维团队。
