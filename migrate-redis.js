#!/usr/bin/env node
/**
 * Redis Migration Script
 * Migrates data from Upstash Redis to Local Redis
 */

const { Redis } = require('@upstash/redis');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

// Configuration
const UPSTASH_CONFIG = {
  url: 'https://awake-mammoth-18723.upstash.io',
  token: 'AUkjAAIncDJhMmJjNjY4NjAwNjM0ZGMzOGNhYTYyNzRiMGIwOWE0YXAyMTg3MjM'
};

const LOCAL_REDIS_URL = 'redis://localhost:6379';
const BACKUP_FILE = path.join(__dirname, 'redis-backup.json');

// Initialize clients
const upstashClient = new Redis(UPSTASH_CONFIG);
let localClient = null;

// Progress tracking
let stats = {
  totalKeys: 0,
  exported: 0,
  imported: 0,
  errors: []
};

/**
 * Export data from Upstash Redis
 */
async function exportFromUpstash() {
  console.log('\n📤 Starting export from Upstash Redis...\n');

  try {
    // Get all keys
    const keys = await upstashClient.keys('*');
    stats.totalKeys = keys.length;
    console.log(`Found ${stats.totalKeys} keys to export\n`);

    const data = {};

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        // Show progress
        if ((i + 1) % 10 === 0 || i === 0 || i === keys.length - 1) {
          process.stdout.write(`\rExporting: ${i + 1}/${keys.length} (${Math.round((i + 1) / keys.length * 100)}%)`);
        }

        // Get key type
        const type = await upstashClient.type(key);

        // Export based on type
        switch (type) {
          case 'hash':
            data[key] = {
              type: 'hash',
              value: await upstashClient.hgetall(key)
            };
            break;

          case 'string':
            data[key] = {
              type: 'string',
              value: await upstashClient.get(key)
            };
            break;

          case 'zset':
            const zsetData = await upstashClient.zrange(key, 0, -1, { withScores: true });
            data[key] = {
              type: 'zset',
              value: zsetData
            };
            break;

          case 'list':
            data[key] = {
              type: 'list',
              value: await upstashClient.lrange(key, 0, -1)
            };
            break;

          case 'set':
            data[key] = {
              type: 'set',
              value: await upstashClient.smembers(key)
            };
            break;

          default:
            console.warn(`\nWarning: Unknown type '${type}' for key '${key}'`);
        }

        stats.exported++;

      } catch (err) {
        stats.errors.push({ key, error: err.message, phase: 'export' });
        console.error(`\nError exporting ${key}:`, err.message);
      }
    }

    console.log(`\n\n✅ Export completed: ${stats.exported}/${stats.totalKeys} keys\n`);

    // Save to file
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));
    console.log(`💾 Backup saved to: ${BACKUP_FILE}\n`);
    console.log(`📊 File size: ${(fs.statSync(BACKUP_FILE).size / 1024 / 1024).toFixed(2)} MB\n`);

    return data;

  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

/**
 * Import data to Local Redis
 */
async function importToLocal(data) {
  console.log('\n📥 Starting import to Local Redis...\n');

  try {
    // Connect to local Redis
    localClient = createClient({ url: LOCAL_REDIS_URL });
    await localClient.connect();
    console.log('✅ Connected to local Redis\n');

    const keys = Object.keys(data);

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
              await localClient.hSet(key, item.value);
            }
            break;

          case 'string':
            if (item.value !== null && item.value !== undefined) {
              await localClient.set(key, String(item.value));
            }
            break;

          case 'zset':
            if (Array.isArray(item.value) && item.value.length > 0) {
              // Convert array to array of {score, value} objects
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
        stats.errors.push({ key, error: err.message, phase: 'import' });
        console.error(`\nError importing ${key}:`, err.message);
      }
    }

    console.log(`\n\n✅ Import completed: ${stats.imported}/${keys.length} keys\n`);

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    if (localClient) {
      await localClient.quit();
    }
  }
}

/**
 * Verify migration
 */
async function verifyMigration(data) {
  console.log('\n🔍 Verifying migration...\n');

  try {
    localClient = createClient({ url: LOCAL_REDIS_URL });
    await localClient.connect();

    const keys = Object.keys(data);
    let verified = 0;
    let failed = 0;

    for (const key of keys) {
      try {
        const exists = await localClient.exists(key);
        if (exists) {
          verified++;
        } else {
          failed++;
          console.warn(`❌ Key not found in local Redis: ${key}`);
        }
      } catch (err) {
        failed++;
        console.error(`Error verifying ${key}:`, err.message);
      }
    }

    // Get database size
    const dbSize = await localClient.dbSize();

    console.log(`\n📊 Verification Results:`);
    console.log(`   ✅ Verified: ${verified}/${keys.length}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   💾 Local DB Size: ${dbSize} keys\n`);

    return { verified, failed };

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    if (localClient) {
      await localClient.quit();
    }
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('\n========================================');
  console.log('   Redis Migration Tool');
  console.log('   Upstash → Local Redis');
  console.log('========================================\n');

  const startTime = Date.now();

  try {
    // Step 1: Export from Upstash
    const data = await exportFromUpstash();

    // Step 2: Import to Local
    await importToLocal(data);

    // Step 3: Verify
    const verification = await verifyMigration(data);

    // Final statistics
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n========================================');
    console.log('   Migration Summary');
    console.log('========================================\n');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📤 Exported: ${stats.exported} keys`);
    console.log(`📥 Imported: ${stats.imported} keys`);
    console.log(`✅ Verified: ${verification.verified} keys`);
    console.log(`❌ Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.key} (${err.phase}): ${err.error}`);
      });
    }

    console.log('\n💾 Backup file: ' + BACKUP_FILE);
    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrate().catch(console.error);
}

module.exports = { migrate, exportFromUpstash, importToLocal, verifyMigration };
