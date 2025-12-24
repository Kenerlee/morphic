#!/usr/bin/env python3
"""
Upstash to Local Redis Migration Script
Handles Hash, String, List, Set, and ZSet data types
"""

import json
import redis
import requests
from typing import Any

# Configuration
UPSTASH_URL = "https://awake-mammoth-18723.upstash.io"
UPSTASH_TOKEN = "AUkjAAIncDJhMmJjNjY4NjAwNjM0ZGMzOGNhYTYyNzRiMGIwOWE0YXAyMTg3MjM"
LOCAL_REDIS_HOST = "localhost"
LOCAL_REDIS_PORT = 6379

def upstash_request(command: str, *args) -> Any:
    """Make a request to Upstash REST API"""
    path = "/" + "/".join([command] + [str(a) for a in args])
    url = UPSTASH_URL + path
    headers = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}
    response = requests.get(url, headers=headers)
    data = response.json()
    return data.get("result")

def upstash_post(commands: list) -> Any:
    """Make a pipeline request to Upstash"""
    url = UPSTASH_URL + "/pipeline"
    headers = {
        "Authorization": f"Bearer {UPSTASH_TOKEN}",
        "Content-Type": "application/json"
    }
    response = requests.post(url, headers=headers, json=commands)
    return response.json()

def main():
    print("=== Upstash to Local Redis Migration ===\n")

    # Connect to local Redis
    print("1. Connecting to local Redis...")
    try:
        local_redis = redis.Redis(host=LOCAL_REDIS_HOST, port=LOCAL_REDIS_PORT, decode_responses=True)
        local_redis.ping()
        print("   ✓ Connected to local Redis\n")
    except redis.ConnectionError:
        print("   ✗ ERROR: Cannot connect to local Redis!")
        print("   Start it with: brew services start redis")
        return

    # Get all keys from Upstash
    print("2. Fetching keys from Upstash...")
    keys = upstash_request("keys", "*")
    print(f"   Found {len(keys)} keys to migrate\n")

    # Migrate each key
    print("3. Migrating data...")
    migrated = 0
    failed = 0

    for key in keys:
        try:
            # Get key type
            key_type = upstash_request("type", key)

            if key_type == "hash":
                # Get hash data
                hash_data = upstash_request("hgetall", key)
                if hash_data:
                    # Convert list to dict (Upstash returns [field1, value1, field2, value2, ...])
                    hash_dict = {}
                    for i in range(0, len(hash_data), 2):
                        hash_dict[hash_data[i]] = hash_data[i + 1]
                    local_redis.hset(key, mapping=hash_dict)
                    migrated += 1
                    print(f"   ✓ [hash] {key}")
                else:
                    failed += 1
                    print(f"   ✗ [hash] {key} (empty)")

            elif key_type == "string":
                # Get string data
                value = upstash_request("get", key)
                if value is not None:
                    local_redis.set(key, value)
                    migrated += 1
                    print(f"   ✓ [string] {key}")
                else:
                    failed += 1
                    print(f"   ✗ [string] {key} (empty)")

            elif key_type == "list":
                # Get list data
                list_data = upstash_request("lrange", key, 0, -1)
                if list_data:
                    local_redis.delete(key)
                    local_redis.rpush(key, *list_data)
                    migrated += 1
                    print(f"   ✓ [list] {key}")
                else:
                    failed += 1
                    print(f"   ✗ [list] {key} (empty)")

            elif key_type == "set":
                # Get set data
                set_data = upstash_request("smembers", key)
                if set_data:
                    local_redis.delete(key)
                    local_redis.sadd(key, *set_data)
                    migrated += 1
                    print(f"   ✓ [set] {key}")
                else:
                    failed += 1
                    print(f"   ✗ [set] {key} (empty)")

            elif key_type == "zset":
                # Get sorted set data
                zset_data = upstash_request("zrange", key, 0, -1, "WITHSCORES")
                if zset_data:
                    local_redis.delete(key)
                    # zset_data is [member1, score1, member2, score2, ...]
                    for i in range(0, len(zset_data), 2):
                        local_redis.zadd(key, {zset_data[i]: float(zset_data[i + 1])})
                    migrated += 1
                    print(f"   ✓ [zset] {key}")
                else:
                    failed += 1
                    print(f"   ✗ [zset] {key} (empty)")

            else:
                print(f"   ? [{key_type}] {key} (unsupported type)")
                failed += 1

        except Exception as e:
            print(f"   ✗ {key} (error: {e})")
            failed += 1

    print(f"\n=== Migration Complete ===")
    print(f"   Migrated: {migrated}")
    print(f"   Failed:   {failed}")

    # Verify
    print(f"\n4. Verification...")
    local_keys = local_redis.keys("*")
    print(f"   Local Redis now has {len(local_keys)} keys")

    # Show sample data
    if local_keys:
        sample_key = local_keys[0]
        key_type = local_redis.type(sample_key)
        print(f"\n   Sample: {sample_key} (type: {key_type})")

if __name__ == "__main__":
    main()
