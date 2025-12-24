# 🚀 部署指南

## 📋 部署前准备

### 1. 服务器要求
- **操作系统**: Linux (Ubuntu 20.04+ / CentOS 7+) 或 macOS
- **Python**: 3.9+
- **内存**: 至少 1GB RAM
- **端口**: 8000 (可配置)

### 2. 需要的文件
将以下文件上传到服务器：
```
skills_api.py
requirements.txt
deploy.sh
.env (包含您的 API 密钥)
.gitignore
```

## 🔧 快速部署步骤

### 方法 1: 自动部署（推荐）

```bash
# 1. 上传文件到服务器
scp -r /Users/kadenliu/claudeapitest/* your-server:/path/to/app/

# 2. SSH 登录服务器
ssh your-server

# 3. 进入项目目录
cd /path/to/app/

# 4. 运行部署脚本
chmod +x deploy.sh
./deploy.sh

# 5. 启动服务
source venv/bin/activate
python skills_api.py
```

### 方法 2: 手动部署

```bash
# 1. 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置 API 密钥
# 编辑 .env 文件
nano .env
# 添加: ANTHROPIC_API_KEY=your-api-key-here

# 4. 启动服务
python skills_api.py
```

## 🌐 生产部署选项

### 选项 1: 使用 Gunicorn (推荐)

```bash
# 1. 安装 gunicorn
pip install gunicorn

# 2. 启动服务 (4个worker进程)
gunicorn skills_api:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

### 选项 2: 使用 systemd (开机自启动)

创建服务文件：
```bash
sudo nano /etc/systemd/system/skills-api.service
```

添加以下内容：
```ini
[Unit]
Description=Anthropic Skills API Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/app
Environment="PATH=/path/to/app/venv/bin"
ExecStart=/path/to/app/venv/bin/gunicorn skills_api:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl start skills-api
sudo systemctl enable skills-api  # 开机自启动
sudo systemctl status skills-api  # 查看状态
```

### 选项 3: 使用 Docker

创建 `Dockerfile`:
```dockerfile
FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY skills_api.py .
COPY .env .

EXPOSE 8000

CMD ["python", "skills_api.py"]
```

构建和运行：
```bash
# 构建镜像
docker build -t skills-api .

# 运行容器
docker run -d \
  --name skills-api \
  -p 8000:8000 \
  --restart always \
  skills-api
```

### 选项 4: 后台运行

```bash
# 使用 nohup
nohup python skills_api.py > api.log 2>&1 &

# 查看日志
tail -f api.log

# 停止服务
ps aux | grep skills_api.py
kill <PID>
```

## 🔒 安全配置

### 1. 使用 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/skills-api
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/skills-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. 配置 HTTPS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. 防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 8000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## 📊 监控和维护

### 查看日志
```bash
# systemd 服务日志
sudo journalctl -u skills-api -f

# 直接运行的日志
tail -f api.log
```

### 性能监控
```bash
# 查看进程状态
ps aux | grep skills_api

# 查看端口占用
netstat -tulpn | grep 8000

# 查看资源使用
top
htop
```

### 重启服务
```bash
# systemd
sudo systemctl restart skills-api

# Docker
docker restart skills-api

# 手动运行的
kill <PID>
python skills_api.py &
```

## 🧪 部署后测试

```bash
# 健康检查
curl http://your-server:8000/health

# 列出 Skills
curl http://your-server:8000/skills

# 测试 API 调用
curl -X POST http://your-server:8000/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "skill_ids": ["pdf"],
    "message": "测试",
    "max_tokens": 100
  }'
```

## ⚙️ 环境变量配置

`.env` 文件示例：
```bash
# 必需
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# 可选
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=info
```

## 🔧 故障排查

### 问题 1: 端口被占用
```bash
# 查找占用端口的进程
lsof -i :8000
# 或
netstat -tulpn | grep 8000

# 杀死进程
kill -9 <PID>
```

### 问题 2: API 密钥无效
```bash
# 检查 .env 文件
cat .env
# 确保没有多余的空格或引号
```

### 问题 3: 依赖安装失败
```bash
# 升级 pip
pip install --upgrade pip

# 清理缓存重新安装
pip cache purge
pip install -r requirements.txt
```

## 📈 性能优化

### 调整 Worker 数量
```bash
# 根据 CPU 核心数
workers = (2 × CPU核心数) + 1

# 示例: 4核CPU
gunicorn skills_api:app -w 9 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### 限制连接数
```python
# 在 skills_api.py 中配置
app = FastAPI(
    max_workers=100,
    timeout=60
)
```

## 🔄 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 安装新依赖
pip install -r requirements.txt

# 3. 重启服务
sudo systemctl restart skills-api
```

## 📞 支持

部署遇到问题？检查：
1. 日志文件
2. API 密钥是否正确
3. 端口是否可访问
4. 防火墙设置

---

**部署成功后，访问**: http://your-server:8000/docs 查看 API 文档
