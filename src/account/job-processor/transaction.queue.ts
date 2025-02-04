import { Job, Worker } from 'bullmq';
import { BaseQueue } from '../../configs/bull/bullmq.base';
import { RedisCache } from '../../configs/redis/redis.service';
import { TransactionProcessor } from './transaction.processor';
import { TransactionJobType } from '../enum/transaction.enum';
import { singleton } from 'tsyringe';
import { Logger } from '../../common/logger/logger';

@singleton()
export class TransactionQueue extends BaseQueue {
  protected worker: Worker;

  constructor(
    private readonly cacheService: RedisCache,
    private readonly transactionProcessor: TransactionProcessor,
    private readonly logger: Logger
  ) {
    super('Transaction', cacheService);

    this.worker = new Worker(
      'Transaction',
      async (job: Job) => {
        try {
          await this.transactionProcessor.process(job);
        } catch (error: any) {
          throw error;
        }
      },
      { connection: cacheService.getRedisInstance(), concurrency: 2 }
    );
  }

  async addJob(name: TransactionJobType, data: any): Promise<void> {
    try {
      await this.queue.add(name, data);
      this.logger.appLogger.info(
        `Transaction job added: Ref: ${
          data.reference
        }, Type: ${name}, Timestamp: ${new Date().toISOString()}`
      );
    } catch (error) {
      this.logger.appLogger.error(
        `Failed adding transaction job [${name}]: ref: ${
          data?.reference
        } Timestamp: ${new Date().toISOString()}`
      );
    }
  }

  getQueue() {
    return this.queue;
  }
}
