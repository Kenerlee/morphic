#!/bin/bash
# 通过 curl 完整执行民宿调研 Skill 的多轮对话

API_KEY="sk-0kMWU6LVas6lrj_UYIIM8g"
BASE_URL="https://llm.moments.top"
MODEL="claude-sonnet-4-5"
SKILL_ID="skill_015FtmDcs3NUKhwqTgukAyWc"

echo "======================================================================"
echo "  🏠 民宿市场调研 Skill 完整执行测试"
echo "======================================================================"
echo ""
echo "Skill ID: $SKILL_ID"
echo "Model: $MODEL"
echo ""

# 第1轮：发起调研请求
echo "======================================================================"
echo "  第1轮：发起调研请求"
echo "======================================================================"

USER_MSG_1='请帮我做杭州西湖龙井村民宿市场调研。基本信息：龙井村3层老宅300平米，6间客房，年租15万，预算50万，目标2年回本，定位茶文化精品民宿，客群是年轻情侣和小家庭。请开始进行分析。'

echo ""
echo "👤 用户: $USER_MSG_1"
echo ""
echo "🔄 正在调用 Skill..."
echo ""

RESPONSE_1=$(curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -H "anthropic-beta: code-execution-2025-08-25,skills-2025-10-02" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": \"$USER_MSG_1\"}],
    \"max_tokens\": 4096,
    \"container\": {
      \"skills\": [{\"type\": \"custom\", \"skill_id\": \"$SKILL_ID\", \"version\": \"latest\"}]
    },
    \"tools\": [{\"type\": \"code_execution_20250825\", \"name\": \"code_execution\"}]
  }" --max-time 300)

if [ $? -ne 0 ]; then
  echo "❌ 第1轮调用失败"
  exit 1
fi

# 提取助手回复
ASSISTANT_1=$(echo "$RESPONSE_1" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('choices', [{}])[0].get('message', {}).get('content', 'No content'))")

# 提取 container_id（如果有）
CONTAINER_ID=$(echo "$RESPONSE_1" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('provider_specific_fields', {}).get('container', {}).get('id', ''))" 2>/dev/null || echo "")

echo "🤖 助手回复:"
echo "----------------------------------------------------------------------"
echo "$ASSISTANT_1"
echo "----------------------------------------------------------------------"

if [ -n "$CONTAINER_ID" ]; then
  echo ""
  echo "📦 Container ID: $CONTAINER_ID"
fi

# 第2轮：请求详细分析
echo ""
echo "======================================================================"
echo "  第2轮：请求详细分析"
echo "======================================================================"

USER_MSG_2='请基于上述信息，开始进行详细的市场调研分析，包括：1. 流量趋势 2. 竞品分析 3. 投资回报测算 4. Go或No-Go建议'

echo ""
echo "👤 用户: $USER_MSG_2"
echo ""
echo "🔄 正在调用 Skill..."
echo ""

# 构建带历史消息的请求
if [ -n "$CONTAINER_ID" ]; then
  CONTAINER_JSON="{\"id\": \"$CONTAINER_ID\", \"skills\": [{\"type\": \"custom\", \"skill_id\": \"$SKILL_ID\", \"version\": \"latest\"}]}"
else
  CONTAINER_JSON="{\"skills\": [{\"type\": \"custom\", \"skill_id\": \"$SKILL_ID\", \"version\": \"latest\"}]}"
fi

# 转义助手回复中的特殊字符用于 JSON
ASSISTANT_1_ESCAPED=$(echo "$ASSISTANT_1" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))")

RESPONSE_2=$(curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -H "anthropic-beta: code-execution-2025-08-25,skills-2025-10-02" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [
      {\"role\": \"user\", \"content\": \"$USER_MSG_1\"},
      {\"role\": \"assistant\", \"content\": $ASSISTANT_1_ESCAPED},
      {\"role\": \"user\", \"content\": \"$USER_MSG_2\"}
    ],
    \"max_tokens\": 4096,
    \"container\": $CONTAINER_JSON,
    \"tools\": [{\"type\": \"code_execution_20250825\", \"name\": \"code_execution\"}]
  }" --max-time 300)

if [ $? -ne 0 ]; then
  echo "❌ 第2轮调用失败"
  exit 1
fi

ASSISTANT_2=$(echo "$RESPONSE_2" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('choices', [{}])[0].get('message', {}).get('content', 'No content'))")

echo "🤖 助手回复:"
echo "----------------------------------------------------------------------"
echo "$ASSISTANT_2"
echo "----------------------------------------------------------------------"

# 打印使用统计
echo ""
echo "======================================================================"
echo "  📊 调用统计"
echo "======================================================================"
echo "$RESPONSE_2" | python3 -c "
import sys, json
data = json.load(sys.stdin)
usage = data.get('usage', {})
print(f\"Prompt Tokens: {usage.get('prompt_tokens', 'N/A')}\")
print(f\"Completion Tokens: {usage.get('completion_tokens', 'N/A')}\")
print(f\"Total Tokens: {usage.get('total_tokens', 'N/A')}\")
"

echo ""
echo "======================================================================"
echo "  ✅ 调研完成"
echo "======================================================================"
