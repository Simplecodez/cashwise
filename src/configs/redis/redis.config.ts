import { RedisOptions } from 'ioredis';

export const redisConfigOptions: RedisOptions = {
  port: +(process.env.REDIS_PORT as string),
  host: process.env.REDIS_HOST as string,
  password: process.env.REDIS_PASSWORD as string,
  maxRetriesPerRequest: null, // Ensure no max retries for blocking clients
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 500);
    return delay;
  }
};
