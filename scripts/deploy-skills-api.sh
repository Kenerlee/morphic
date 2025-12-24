#!/bin/bash
# =============================================================================
# Skills API 部署脚本
# 用途：部署 Python Skills API 服务
# 用法：bash deploy-skills-api.sh
# =============================================================================

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# 配置
# =============================================================================
APP_USER="navix"
SKILLS_DIR="/var/www/navix/SkillsApi"

# =============================================================================
# 检查目录
# =============================================================================
if [ ! -d "$SKILLS_DIR" ]; then
    log_error "Skills API 目录不存在: $SKILLS_DIR"
    exit 1
fi

cd $SKILLS_DIR
log_info "进入目录 $SKILLS_DIR"

# =============================================================================
# 1. 创建/更新虚拟环境
# =============================================================================
log_info "1/4 设置 Python 虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    log_info "虚拟环境创建完成"
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
log_info "依赖安装完成"

# =============================================================================
# 2. 检查环境变量
# =============================================================================
log_info "2/4 检查环境配置..."

# Skills API 会从父目录读取 .env.local
if [ ! -f "../.env.local" ]; then
    log_warn "父目录未找到 .env.local"
    if [ ! -f ".env" ]; then
        log_error "未找到任何环境配置文件！"
        log_error "请确保 ../.env.local 或 .env 包含 ANTHROPIC_API_KEY"
        exit 1
    fi
fi
log_info "环境配置检查通过"

# =============================================================================
# 3. 停止旧服务
# =============================================================================
log_info "3/4 停止旧服务..."
if pm2 list | grep -q "skills-api"; then
    pm2 stop skills-api 2>/dev/null || true
    pm2 delete skills-api 2>/dev/null || true
fi

# 杀掉可能存在的进程
pkill -f "skills_api.py" 2>/dev/null || true
sleep 1

# =============================================================================
# 4. 启动服务
# =============================================================================
log_info "4/4 启动 Skills API..."

# 使用 PM2 管理 Python 进程
pm2 start venv/bin/python --name "skills-api" -- skills_api.py
pm2 save

log_info "Skills API 启动完成"

# =============================================================================
# 验证
# =============================================================================
sleep 3
if curl -s http://localhost:8000/health | grep -q "ok"; then
    log_info "健康检查通过 ✓"
else
    log_warn "健康检查未通过，请检查日志: pm2 logs skills-api"
fi

echo ""
echo "=============================================="
log_info "Skills API 部署完成！"
echo "=============================================="
pm2 list
echo ""
echo "API 地址: http://localhost:8000"
echo "健康检查: curl http://localhost:8000/health"
echo "查看日志: pm2 logs skills-api"
echo "=============================================="
