import Redis from 'ioredis';
import { singleton } from 'tsyringe';
import { redisConfigOptions } from './redis.config';
import { Logger } from '../../common/logger/logger';

@singleton()
export class RedisCache {
  private redis: Redis;
  constructor(private readonly logger: Logger) {
    this.redis = new Redis(redisConfigOptions);
    this.redis.on('connect', () => {
      this.logger.appLogger.info('Redis connection established');
    });
    this.redis.on('error', (error) => {
      this.logger.appLogger.info(error);
    });
  }

  async set(key: string, value: any, expire: number = 300) {
    const serializedValue = JSON.stringify(value);
    await this.redis.set(key, serializedValue, 'EX', expire);
  }

  async get(key: string) {
    const value = await this.redis.get(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  }

  async del(key: string) {
    return await this.redis.del(key);
  }

  async flushdb(): Promise<void> {
    await this.redis.flushdb();
  }

  getRedisInstance() {
    return this.redis;
  }
}
