#!/bin/bash
# 部署 Skills Proxy 到服务器
# 用法: ./deploy_skills_proxy.sh

SERVER="root@14.103.248.138"
KEY="/Users/xxXxx/GenAI2025/NaviX/key1010.pem"
REMOTE_PATH="/root/skills_proxy"

echo "=== 部署 Skills Proxy 到服务器 ==="

# 1. 创建远程目录
echo "1. 创建远程目录..."
ssh -i "$KEY" "$SERVER" "mkdir -p $REMOTE_PATH"

# 2. 复制文件
echo "2. 复制文件..."
scp -i "$KEY" ../SkillsApi/skills_api.py "$SERVER:$REMOTE_PATH/"
scp -i "$KEY" ../SkillsApi/requirements.txt "$SERVER:$REMOTE_PATH/"

# 3. 创建 .env 文件模板
echo "3. 创建环境配置..."
ssh -i "$KEY" "$SERVER" "cat > $REMOTE_PATH/.env << 'EOF'
ANTHROPIC_API_KEY=your_key_here
EOF"

# 4. 安装依赖
echo "4. 安装依赖..."
ssh -i "$KEY" "$SERVER" "cd $REMOTE_PATH && pip3 install -r requirements.txt"

# 5. 创建 systemd 服务
echo "5. 创建系统服务..."
ssh -i "$KEY" "$SERVER" "cat > /etc/systemd/system/skills-proxy.service << 'EOF'
[Unit]
Description=Skills Proxy API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/skills_proxy
ExecStart=/usr/bin/python3 skills_api.py
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF"

# 6. 启动服务
echo "6. 启动服务..."
ssh -i "$KEY" "$SERVER" "systemctl daemon-reload && systemctl enable skills-proxy && systemctl start skills-proxy"

echo ""
echo "=== 部署完成 ==="
echo "API 地址: http://14.103.248.138:8000"
echo ""
echo "请登录服务器设置 ANTHROPIC_API_KEY:"
echo "  ssh -i \"$KEY\" $SERVER"
echo "  nano /root/skills_proxy/.env"
echo "  systemctl restart skills-proxy"
