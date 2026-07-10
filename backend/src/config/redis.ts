import Redis from 'ioredis';
import MockRedis from 'ioredis-mock';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const isMock = process.env.MOCK_MODE === 'true';

let redisInstance: any;

if (isMock) {
  console.log('Using ioredis-mock for Redis (MOCK_MODE)');
  redisInstance = new MockRedis();
} else {
  console.log(`Connecting to Redis at: ${redisUrl}`);
  redisInstance = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 2) {
        console.warn('Redis connection failed. Falling back to ioredis-mock.');
        redisInstance = new MockRedis();
        return null; // Stop retrying
      }
      const delay = Math.min(times * 100, 2000);
      return delay;
    },
  });

  redisInstance.on('connect', () => {
    console.log('Redis connected successfully.');
  });

  redisInstance.on('error', (err: Error) => {
    if (redisInstance instanceof MockRedis) return;
    console.error('Redis connection error:', err.message || err);
  });
}

export const redis = new Proxy({} as any, {
  get(target, prop) {
    const value = redisInstance[prop];
    if (typeof value === 'function') {
      return value.bind(redisInstance);
    }
    return value;
  },
  set(target, prop, value) {
    redisInstance[prop] = value;
    return true;
  }
});
