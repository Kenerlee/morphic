# Anthropic Skills API 服务

一个支持调用多个 Anthropic Skills 的 FastAPI 服务，内置 5 QPS 限流保护。

## 🚀 快速开始

### 1. 启动服务

```bash
cd /Users/kadenliu/claudeapitest
source venv/bin/activate
python skills_api.py
```

服务将在 `http://localhost:8000` 启动

### 2. 访问文档

- **交互式 API 文档**: http://localhost:8000/docs
- **备用文档**: http://localhost:8000/redoc

## 📋 可用的 Skills

### Anthropic 官方 Skills

| Skill ID | 名称 | 描述 |
|----------|------|------|
| `pdf` | PDF Processing | 提取、创建、合并和处理 PDF 文档 |
| `xlsx` | Excel Processing | 创建和分析 Excel 表格 |
| `pptx` | PowerPoint Processing | 创建和修改 PowerPoint 演示文稿 |
| `docx` | Word Processing | 创建和编辑 Word 文档 |

### 自定义 Skills

| Skill ID | 名称 | 描述 |
|----------|------|------|
| `skill_014ko5Yg5TtsnS9mYBt5PtR2` | Customer Segmentation | 使用 Targeting™ 模型的高级客户分群分析 |
| `skill_015FtmDcs3NUKhwqTgukAyWc` | Homestay Market Entry | 数据驱动的民宿投资决策支持和市场调研 |

## 🔌 API 端点

### 1. 列出所有 Skills

```bash
GET /skills
```

**示例响应：**
```json
{
  "total": 6,
  "skills": {
    "pdf": {
      "type": "anthropic",
      "name": "PDF Processing",
      "description": "Extract, create, merge, and manipulate PDF documents"
    }
  }
}
```

### 2. 调用多个 Skills

```bash
POST /invoke
```

**请求体：**
```json
{
  "skill_ids": ["pdf", "xlsx"],
  "message": "Create a PDF report with data from an Excel file",
  "max_tokens": 4096,
  "container_id": null
}
```

**响应：**
```json
{
  "status": "success",
  "container_id": "container_xxx",
  "stop_reason": "end_turn",
  "model": "claude-sonnet-4-5-20250929",
  "response": [
    {
      "type": "text",
      "text": "I'll help you create a PDF report..."
    }
  ],
  "usage": {
    "input_tokens": 1234,
    "output_tokens": 5678
  }
}
```

### 3. 调用单个 Skill (简化版)

```bash
POST /invoke/{skill_name}?message=your_message&max_tokens=4096
```

**示例：**
```bash
POST /invoke/pdf?message=Extract text from a PDF&max_tokens=2048
```

### 4. 健康检查

```bash
GET /health
```

## 📝 使用示例

### Python 示例

```python
import requests

# 1. 列出所有 Skills
response = requests.get("http://localhost:8000/skills")
print(response.json())

# 2. 使用 PDF Skill
response = requests.post(
    "http://localhost:8000/invoke",
    json={
        "skill_ids": ["pdf"],
        "message": "Extract text from a sample PDF",
        "max_tokens": 2048
    }
)
print(response.json())

# 3. 使用客户分群 Skill
response = requests.post(
    "http://localhost:8000/invoke",
    json={
        "skill_ids": ["skill_014ko5Yg5TtsnS9mYBt5PtR2"],
        "message": "Analyze customer segments for retail business",
        "max_tokens": 4096
    }
)
print(response.json())

# 4. 同时使用多个 Skills
response = requests.post(
    "http://localhost:8000/invoke",
    json={
        "skill_ids": ["xlsx", "pptx"],
        "message": "Analyze sales data and create a presentation",
        "max_tokens": 4096
    }
)
print(response.json())
```

### cURL 示例

```bash
# 列出 Skills
curl http://localhost:8000/skills

# 调用 PDF Skill
curl -X POST http://localhost:8000/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "skill_ids": ["pdf"],
    "message": "Create a PDF report",
    "max_tokens": 2048
  }'

# 使用民宿投资分析 Skill
curl -X POST http://localhost:8000/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "skill_ids": ["skill_015FtmDcs3NUKhwqTgukAyWc"],
    "message": "分析北京三里屯地区的民宿投资机会",
    "max_tokens": 4096
  }'

# 简化版调用
curl -X POST "http://localhost:8000/invoke/customer-segmentation?message=Segment%20my%20customers&max_tokens=2048"
```

### JavaScript 示例

```javascript
// 使用 fetch
const response = await fetch('http://localhost:8000/invoke', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    skill_ids: ['xlsx', 'pptx'],
    message: 'Create a sales presentation with charts',
    max_tokens: 4096
  })
});

const result = await response.json();
console.log(result);
```

## ⚡ 限流说明

- **限流配置**: 5 QPS (每秒5个请求)
- **限流方式**: 基于客户端 IP 地址
- **超限响应**: HTTP 429 Too Many Requests

**限流错误响应示例：**
```json
{
  "error": "Rate limit exceeded: 5 per 1 second"
}
```

## 🔐 多轮对话

使用 `container_id` 参数可以实现多轮对话：

```python
# 第一轮
response1 = requests.post(
    "http://localhost:8000/invoke",
    json={
        "skill_ids": ["xlsx"],
        "message": "Analyze this sales data"
    }
)
container_id = response1.json()["container_id"]

# 第二轮 - 复用同一个 container
response2 = requests.post(
    "http://localhost:8000/invoke",
    json={
        "skill_ids": ["xlsx"],
        "message": "What was the total revenue?",
        "container_id": container_id
    }
)
```

## 📊 最佳实践

### 1. Skill 组合建议

**数据分析 + 报告生成：**
```json
{
  "skill_ids": ["xlsx", "pptx"],
  "message": "Analyze Q4 sales data and create executive presentation"
}
```

**客户分析 + 文档输出：**
```json
{
  "skill_ids": ["skill_014ko5Yg5TtsnS9mYBt5PtR2", "docx"],
  "message": "Segment customers and generate a strategy document"
}
```

### 2. Token 使用建议

- 简单查询: `max_tokens: 1024-2048`
- 数据分析: `max_tokens: 2048-4096`
- 复杂报告生成: `max_tokens: 4096-8192`

### 3. 错误处理

```python
try:
    response = requests.post(
        "http://localhost:8000/invoke",
        json={
            "skill_ids": ["pdf"],
            "message": "Process document"
        },
        timeout=60
    )
    response.raise_for_status()
    result = response.json()
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 429:
        print("Rate limit exceeded, please retry later")
    elif e.response.status_code == 400:
        print(f"Bad request: {e.response.json()}")
    else:
        print(f"Error: {e}")
```

## 🛠️ 配置

### 环境变量

在 `.env` 文件中配置：

```bash
ANTHROPIC_API_KEY=your-api-key-here
```

### 修改限流配置

在 `skills_api.py` 中修改：

```python
# 修改为 10 QPS
@limiter.limit("10/second")
async def invoke_skills(request: Request, skill_request: SkillRequest):
    ...
```

### 修改端口

```python
# 启动时指定端口
uvicorn.run(app, host="0.0.0.0", port=8080)
```

## 🐛 故障排查

### 问题 1: API 密钥无效

**错误信息**: `ANTHROPIC_API_KEY not found in environment variables`

**解决方案**: 检查 `.env` 文件是否存在且包含有效的 API 密钥

### 问题 2: 限流过快

**错误信息**: `429 Too Many Requests`

**解决方案**: 
- 降低请求频率
- 或修改限流配置

### 问题 3: Skill 不存在

**错误信息**: `Invalid skill IDs: ['xxx']`

**解决方案**: 使用 `GET /skills` 查看可用的 Skill 列表

## 📦 部署

### 本地开发

```bash
python skills_api.py
```

### 生产部署

```bash
# 使用 gunicorn + uvicorn workers
gunicorn skills_api:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Docker 部署

```dockerfile
FROM python:3.13-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "skills_api.py"]
```

## 📄 许可证

MIT License

## 🤝 支持

如有问题，请查看 API 文档: http://localhost:8000/docs
