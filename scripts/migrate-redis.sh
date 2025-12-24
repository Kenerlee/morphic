#!/bin/bash

# Upstash to Local Redis Migration Script
# Usage: ./scripts/migrate-redis.sh

UPSTASH_URL="https://awake-mammoth-18723.upstash.io"
UPSTASH_TOKEN="AUkjAAIncDJhMmJjNjY4NjAwNjM0ZGMzOGNhYTYyNzRiMGIwOWE0YXAyMTg3MjM"
LOCAL_REDIS="redis://localhost:6379"

echo "=== Upstash to Local Redis Migration ==="
echo ""

# Check local Redis
echo "1. Checking local Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "   ERROR: Local Redis is not running!"
    echo "   Start it with: brew services start redis"
    exit 1
fi
echo "   Local Redis is running."

# Get all keys from Upstash
echo ""
echo "2. Fetching keys from Upstash..."
KEYS_JSON=$(curl -s "${UPSTASH_URL}/keys/*" -H "Authorization: Bearer ${UPSTASH_TOKEN}")
KEYS=$(echo "$KEYS_JSON" | python3 -c "import sys, json; keys=json.load(sys.stdin)['result']; print('\n'.join(keys))")
KEY_COUNT=$(echo "$KEYS" | wc -l | tr -d ' ')
echo "   Found ${KEY_COUNT} keys to migrate."

# Migrate each key
echo ""
echo "3. Migrating data..."
MIGRATED=0
FAILED=0

while IFS= read -r key; do
    if [ -z "$key" ]; then
        continue
    fi

    # Get value from Upstash
    VALUE_JSON=$(curl -s "${UPSTASH_URL}/get/${key}" -H "Authorization: Bearer ${UPSTASH_TOKEN}")
    VALUE=$(echo "$VALUE_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin).get('result', ''))" 2>/dev/null)

    if [ -n "$VALUE" ]; then
        # Set value in local Redis
        redis-cli SET "$key" "$VALUE" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            ((MIGRATED++))
            echo "   ✓ $key"
        else
            ((FAILED++))
            echo "   ✗ $key (failed to set)"
        fi
    else
        ((FAILED++))
        echo "   ✗ $key (empty or error)"
    fi
done <<< "$KEYS"

echo ""
echo "=== Migration Complete ==="
echo "   Migrated: ${MIGRATED}"
echo "   Failed:   ${FAILED}"
echo ""

# Verify
echo "4. Verification..."
LOCAL_KEYS=$(redis-cli KEYS '*' | wc -l | tr -d ' ')
echo "   Local Redis now has ${LOCAL_KEYS} keys."
