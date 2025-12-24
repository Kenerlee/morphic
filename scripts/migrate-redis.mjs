#!/usr/bin/env node
/**
 * Upstash to Local Redis Migration Script
 * Handles Hash, String, List, Set, and ZSet data types
 */

import { createClient } from 'redis';

// Configuration
const UPSTASH_URL = 'https://awake-mammoth-18723.upstash.io';
const UPSTASH_TOKEN = 'AUkjAAIncDJhMmJjNjY4NjAwNjM0ZGMzOGNhYTYyNzRiMGIwOWE0YXAyMTg3MjM';
const LOCAL_REDIS_URL = 'redis://localhost:6379';

async function upstashRequest(command, ...args) {
  const path = '/' + [command, ...args].join('/');
  const url = UPSTASH_URL + path;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
  });
  const data = await response.json();
  return data.result;
}

async function main() {
  console.log('=== Upstash to Local Redis Migration ===\n');

  // Connect to local Redis
  console.log('1. Connecting to local Redis...');
  const localRedis = createClient({ url: LOCAL_REDIS_URL });

  try {
    await localRedis.connect();
    await localRedis.ping();
    console.log('   ✓ Connected to local Redis\n');
  } catch (error) {
    console.log('   ✗ ERROR: Cannot connect to local Redis!');
    console.log('   Start it with: brew services start redis');
    return;
  }

  // Get all keys from Upstash
  console.log('2. Fetching keys from Upstash...');
  const keys = await upstashRequest('keys', '*');
  console.log(`   Found ${keys.length} keys to migrate\n`);

  // Migrate each key
  console.log('3. Migrating data...');
  let migrated = 0;
  let failed = 0;

  for (const key of keys) {
    try {
      // Get key type
      const keyType = await upstashRequest('type', key);

      if (keyType === 'hash') {
        // Get hash data
        const hashData = await upstashRequest('hgetall', key);
        if (hashData && hashData.length > 0) {
          // Convert array to object
          const hashObj = {};
          for (let i = 0; i < hashData.length; i += 2) {
            hashObj[hashData[i]] = hashData[i + 1];
          }
          await localRedis.hSet(key, hashObj);
          migrated++;
          console.log(`   ✓ [hash] ${key}`);
        } else {
          failed++;
          console.log(`   ✗ [hash] ${key} (empty)`);
        }

      } else if (keyType === 'string') {
        // Get string data
        const value = await upstashRequest('get', key);
        if (value !== null) {
          await localRedis.set(key, value);
          migrated++;
          console.log(`   ✓ [string] ${key}`);
        } else {
          failed++;
          console.log(`   ✗ [string] ${key} (empty)`);
        }

      } else if (keyType === 'list') {
        // Get list data
        const listData = await upstashRequest('lrange', key, 0, -1);
        if (listData && listData.length > 0) {
          await localRedis.del(key);
          await localRedis.rPush(key, listData);
          migrated++;
          console.log(`   ✓ [list] ${key}`);
        } else {
          failed++;
          console.log(`   ✗ [list] ${key} (empty)`);
        }

      } else if (keyType === 'set') {
        // Get set data
        const setData = await upstashRequest('smembers', key);
        if (setData && setData.length > 0) {
          await localRedis.del(key);
          await localRedis.sAdd(key, setData);
          migrated++;
          console.log(`   ✓ [set] ${key}`);
        } else {
          failed++;
          console.log(`   ✗ [set] ${key} (empty)`);
        }

      } else if (keyType === 'zset') {
        // Get sorted set data with scores
        const zsetData = await upstashRequest('zrange', key, 0, -1, 'WITHSCORES');
        if (zsetData && zsetData.length > 0) {
          await localRedis.del(key);
          const members = [];
          for (let i = 0; i < zsetData.length; i += 2) {
            members.push({ score: parseFloat(zsetData[i + 1]), value: zsetData[i] });
          }
          await localRedis.zAdd(key, members);
          migrated++;
          console.log(`   ✓ [zset] ${key}`);
        } else {
          failed++;
          console.log(`   ✗ [zset] ${key} (empty)`);
        }

      } else {
        console.log(`   ? [${keyType}] ${key} (unsupported type)`);
        failed++;
      }

    } catch (error) {
      console.log(`   ✗ ${key} (error: ${error.message})`);
      failed++;
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Failed:   ${failed}`);

  // Verify
  console.log(`\n4. Verification...`);
  const localKeys = await localRedis.keys('*');
  console.log(`   Local Redis now has ${localKeys.length} keys`);

  await localRedis.quit();
}

main().catch(console.error);
