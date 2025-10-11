#!/usr/bin/env node
/**
 * Redis Import Script (Server-side)
 * Imports data from backup JSON to Local Redis
 */

const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

const LOCAL_REDIS_URL = 'redis://localhost:6379';
const BACKUP_FILE = path.join(__dirname, 'redis-backup.json');

let stats = {
  totalKeys: 0,
  imported: 0,
  errors: []
};

async function importToLocal() {
  console.log('\n========================================');
  console.log('   Redis Import Tool');
  console.log('========================================\n');

  const startTime = Date.now();
  let localClient = null;

  try {
    // Read backup file
    console.log(`📖 Reading backup file: ${BACKUP_FILE}\n`);
    const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
    const keys = Object.keys(data);
    stats.totalKeys = keys.length;

    console.log(`Found ${stats.totalKeys} keys to import\n`);

    // Connect to local Redis
    console.log('🔌 Connecting to local Redis...');
    localClient = createClient({ url: LOCAL_REDIS_URL });
    await localClient.connect();
    console.log('✅ Connected!\n');

    console.log('📥 Starting import...\n');

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const item = data[key];

      try {
        // Show progress
        if ((i + 1) % 10 === 0 || i === 0 || i === keys.length - 1) {
          process.stdout.write(`\rImporting: ${i + 1}/${keys.length} (${Math.round((i + 1) / keys.length * 100)}%)`);
        }

        // Import based on type
        switch (item.type) {
          case 'hash':
            if (item.value && Object.keys(item.value).length > 0) {
              // Convert all hash values to strings
              const stringified = {};
              for (const [k, v] of Object.entries(item.value)) {
                stringified[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
              }
              await localClient.hSet(key, stringified);
            }
            break;

          case 'string':
            if (item.value !== null && item.value !== undefined) {
              await localClient.set(key, String(item.value));
            }
            break;

          case 'zset':
            if (Array.isArray(item.value) && item.value.length > 0) {
              const members = [];
              for (let j = 0; j < item.value.length; j += 2) {
                members.push({
                  score: parseFloat(item.value[j + 1]),
                  value: item.value[j]
                });
              }
              if (members.length > 0) {
                await localClient.zAdd(key, members);
              }
            }
            break;

          case 'list':
            if (Array.isArray(item.value) && item.value.length > 0) {
              await localClient.rPush(key, item.value);
            }
            break;

          case 'set':
            if (Array.isArray(item.value) && item.value.length > 0) {
              await localClient.sAdd(key, item.value);
            }
            break;

          default:
            console.warn(`\nWarning: Unknown type '${item.type}' for key '${key}'`);
        }

        stats.imported++;

      } catch (err) {
        stats.errors.push({ key, error: err.message });
        console.error(`\nError importing ${key}:`, err.message);
      }
    }

    console.log('\n\n');

    // Verify
    const dbSize = await localClient.dbSize();
    console.log('✅ Import completed!\n');
    console.log('📊 Statistics:');
    console.log(`   Total Keys: ${stats.totalKeys}`);
    console.log(`   Imported: ${stats.imported}`);
    console.log(`   Errors: ${stats.errors.length}`);
    console.log(`   DB Size: ${dbSize} keys`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      stats.errors.slice(0, 10).forEach(err => {
        console.log(`   - ${err.key}: ${err.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`   ... and ${stats.errors.length - 10} more errors`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Duration: ${duration}s\n`);

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    if (localClient) {
      await localClient.quit();
    }
  }
}

// Run import
if (require.main === module) {
  importToLocal().catch(console.error);
}

module.exports = { importToLocal };
