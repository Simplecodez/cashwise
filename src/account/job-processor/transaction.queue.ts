import { Job, Worker } from 'bullmq';
import { BaseQueue } from '../../configs/bull/bullmq.base';
import { RedisCache } from '../../configs/redis/redis.service';
import { TransactionProcessor } from './transaction.processor';
import { TransactionJobType } from '../enum/transaction.enum';
import { singleton } from 'tsyringe';

@singleton()
export class TransactionQueue extends BaseQueue {
  protected worker: Worker;

  constructor(
    private readonly cacheService: RedisCache,
    private readonly transactionProcessor: TransactionProcessor
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
    await this.queue.add(name, data);
  }

  getQueue() {
    return this.queue;
  }
}
