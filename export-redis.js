const { Redis } = require('@upstash/redis');
const fs = require('fs');

const redis = new Redis({
  url: 'https://awake-mammoth-18723.upstash.io',
  token: 'AUkjAAIncDJhMmJjNjY4NjAwNjM0ZGMzOGNhYTYyNzRiMGIwOWE0YXAyMTg3MjM'
});

async function exportData() {
  try {
    console.log('Connecting to Upstash Redis...');

    // Get all keys
    const keys = await redis.keys('*');
    console.log(`Found ${keys.length} keys`);

    const data = {};

    for (const key of keys) {
      try {
        // Try different data types
        const type = await redis.type(key);
        console.log(`Exporting ${key} (${type})`);

        if (type === 'hash') {
          data[key] = {
            type: 'hash',
            value: await redis.hgetall(key)
          };
        } else if (type === 'string') {
          data[key] = {
            type: 'string',
            value: await redis.get(key)
          };
        } else if (type === 'zset') {
          data[key] = {
            type: 'zset',
            value: await redis.zrange(key, 0, -1, { withScores: true })
          };
        } else if (type === 'list') {
          data[key] = {
            type: 'list',
            value: await redis.lrange(key, 0, -1)
          };
        } else if (type === 'set') {
          data[key] = {
            type: 'set',
            value: await redis.smembers(key)
          };
        }
      } catch (err) {
        console.error(`Error exporting ${key}:`, err.message);
      }
    }

    // Save to file
    fs.writeFileSync('/tmp/redis-backup.json', JSON.stringify(data, null, 2));
    console.log('Export completed! Data saved to /tmp/redis-backup.json');
    console.log(`Total keys exported: ${Object.keys(data).length}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

exportData();
