import { singleton } from 'tsyringe';
import { RedisCache } from '../../configs/redis/redis.service';
import { Job, Worker } from 'bullmq';
import { BaseQueue } from '../../configs/bull/bullmq.base';
import { AccountProcessor } from './account.processor';

@singleton()
export class AccountQueue extends BaseQueue {
  protected worker: Worker;

  constructor(
    private readonly cacheService: RedisCache,
    private readonly accountProcessor: AccountProcessor
  ) {
    super('Account', cacheService);

    this.worker = new Worker(
      'Account',
      async (job: Job) => {
        try {
          await this.accountProcessor.process(job);
        } catch (error: any) {
          throw error;
        }
      },
      { connection: cacheService.getRedisInstance(), concurrency: 2 }
    );
  }
}
