import { Queue } from 'bullmq';
import { RedisCache } from '../redis/redis.service';

export abstract class BaseQueue {
  protected queue: Queue;
  constructor(queueName: string, redisInstance: RedisCache) {
    this.queue = new Queue(queueName, {
      connection: redisInstance.getRedisInstance(),
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: 500,
        attempts: 3
      }
    });
  }

  protected abstract jobHandler(jobData: any): Promise<void>;
}
