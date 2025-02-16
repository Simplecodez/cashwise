import { singleton } from 'tsyringe';
import { RedisCache } from '../../configs/redis/redis.service';
import { Job, Worker } from 'bullmq';
import { BaseQueue } from '../../configs/bull/bullmq.base';
import { AccountProcessor } from './account.processor';
import { AccountJobType } from '../enum/account.enum';
import { Account } from '../entities/account.entity';
import { ExternalRecipient } from '../entities/external-account.entity';
import { Logger } from '../../common/logger/logger';

@singleton()
export class AccountQueue extends BaseQueue {
  protected worker: Worker;

  constructor(
    private readonly cacheService: RedisCache,
    private readonly accountProcessor: AccountProcessor,
    private readonly logger: Logger
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

  async addJob(
    name: AccountJobType,
    jobData: Partial<Account> | Partial<ExternalRecipient>
  ): Promise<void> {
    try {
      await this.queue.add(name, jobData, {
        removeOnComplete: true
      });

      this.logger.appLogger.info(
        `Account creation job added [${name}]: Timestamp: ${new Date().toISOString()}`
      );
    } catch (error: any) {
      this.logger.appLogger.error(
        `Failed to add account job [${name}]: ${error.message}`,
        error.stack
      );
    }
  }

  getQueue() {
    return this.queue;
  }
}
