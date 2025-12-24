FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY skills_api.py .

# 使用环境变量 PORT（Render/Railway 会自动设置）
ENV PORT=8000

CMD python -c "import os; port = int(os.environ.get('PORT', 8000)); import uvicorn; uvicorn.run('skills_api:app', host='0.0.0.0', port=port)"
