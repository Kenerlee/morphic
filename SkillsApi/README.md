# Anthropic Skills API 项目

一个基于 FastAPI 的 API 服务，用于调用 Anthropic 的各种 Skills，支持 5 QPS 限流。

## 📁 项目结构

```
claudeapitest/
├── .env                          # API 密钥配置（不要提交到 Git）
├── .gitignore                    # Git 忽略文件配置
├── venv/                         # Python 虚拟环境
├── skills_api.py                 # 🔥 主 API 服务器
├── quick_test.py                 # 快速测试脚本
├── run_homestay_demo.py          # 民宿投资 Skill 演示
├── README.md                     # 本文件
└── README_API.md                 # 详细的 API 使用文档
```

## 🚀 快速开始

### 1. 启动 API 服务

```bash
cd /Users/kadenliu/claudeapitest
source venv/bin/activate
python skills_api.py
```

服务将在 `http://localhost:8000` 启动

### 2. 访问 API 文档

浏览器打开：
- **交互式文档**: http://localhost:8000/docs
- **备用文档**: http://localhost:8000/redoc

### 3. 快速测试

```bash
# 运行完整测试
python quick_test.py

# 测试民宿投资 Skill
python run_homestay_demo.py
```

## 📋 可用的 Skills

### Anthropic 官方 Skills
- `pdf` - PDF 文档处理
- `xlsx` - Excel 表格处理
- `pptx` - PowerPoint 演示文稿
- `docx` - Word 文档处理

### 自定义 Skills
- `skill_014ko5Yg5TtsnS9mYBt5PtR2` - 客户分群分析
- `skill_015FtmDcs3NUKhwqTgukAyWc` - 民宿投资决策

## 🔌 API 端点

### 列出所有 Skills
```bash
GET /skills
```

### 调用 Skills
```bash
POST /invoke
Content-Type: application/json

{
  "skill_ids": ["pdf"],
  "message": "你的问题",
  "max_tokens": 4096
}
```

## 💻 使用示例

### Python
```python
import requests

response = requests.post(
    "http://localhost:8000/invoke",
    json={
        "skill_ids": ["pdf"],
        "message": "创建一个 PDF 报告",
        "max_tokens": 2048
    }
)

result = response.json()
print(result['response'][0]['text'])
```

### cURL
```bash
curl -X POST http://localhost:8000/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "skill_ids": ["skill_015FtmDcs3NUKhwqTgukAyWc"],
    "message": "分析北京三里屯民宿投资机会",
    "max_tokens": 4096
  }'
```

## ⚡ 限流说明

- **限制**: 5 QPS (每秒5个请求)
- **基于**: 客户端 IP 地址
- **超限响应**: HTTP 429

## 📚 详细文档

请查看 [README_API.md](./README_API.md) 获取完整的 API 使用文档。

## 🔐 环境配置

Skills API 会自动从以下位置加载环境变量（按优先级）：

1. **项目根目录的 `.env.local`** - 与主 NaviX 项目共享配置（推荐）
2. **SkillsApi/.env** - 本地配置，可覆盖根目录配置

### 推荐方式：使用项目根目录的 .env.local

在项目根目录（navix202501/.env.local）中配置：

```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...
```

这样 Skills API 会自动使用与主项目相同的 API 密钥，无需重复配置。

### 备选方式：单独配置

如需为 Skills API 使用不同的密钥，可在 `SkillsApi/.env` 中配置：

```bash
ANTHROPIC_API_KEY=your-different-api-key-here
```

⚠️ **安全提醒**: 不要将 `.env` 或 `.env.local` 文件提交到 Git 仓库

## 📦 依赖

- Python 3.13+
- FastAPI
- Uvicorn
- Anthropic SDK
- SlowAPI (限流)

安装依赖：
```bash
pip install fastapi uvicorn anthropic slowapi python-multipart
```

## 🛠️ 核心文件说明

### skills_api.py
主 API 服务器，包含：
- FastAPI 应用配置
- Skills 路由
- 5 QPS 限流
- 错误处理

### quick_test.py
快速测试所有 Skills 功能：
- 健康检查
- 列出 Skills
- 测试各个 Skill

### run_homestay_demo.py
民宿投资 Skill 完整演示：
- 功能介绍
- 市场分析
- ROI 计算

## 📞 支持

如有问题，请查看：
- API 文档: http://localhost:8000/docs
- 详细文档: [README_API.md](./README_API.md)

---

**版本**: 1.0.0  
**更新日期**: 2025-12-15
