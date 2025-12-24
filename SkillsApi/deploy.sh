#!/bin/bash
# 部署脚本 - 在服务器上运行

set -e

echo "🚀 开始部署 Anthropic Skills API..."

# 1. 检查 Python 版本
echo "检查 Python 版本..."
python3 --version

# 2. 创建虚拟环境
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

# 3. 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 4. 升级 pip
echo "升级 pip..."
pip install --upgrade pip

# 5. 安装依赖
echo "安装依赖..."
pip install -r requirements.txt

# 6. 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "❌ 错误: 未找到 .env 文件"
    echo "请创建 .env 文件并添加:"
    echo "ANTHROPIC_API_KEY=your-api-key-here"
    exit 1
fi

echo "✅ 部署准备完成!"
echo ""
echo "启动选项:"
echo "1. 开发模式:"
echo "   python skills_api.py"
echo ""
echo "2. 生产模式 (推荐):"
echo "   gunicorn skills_api:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000"
echo ""
echo "3. 后台运行:"
echo "   nohup python skills_api.py > api.log 2>&1 &"
