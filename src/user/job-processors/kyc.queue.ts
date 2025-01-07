import { singleton } from 'tsyringe';
import { BaseQueue } from '../../configs/bull/bullmq.base';
import { RedisCache } from '../../configs/redis/redis.service';
import { Job, Worker } from 'bullmq';
import { KycJobType } from '../enum/kyc.enum';
import { KycProcessor } from './kyc.processor';
import { IKycUpdate } from '../interfaces/kyc.interface';

@singleton()
export class KycQueue extends BaseQueue {
  protected worker: Worker;
  constructor(
    private readonly kycProcessor: KycProcessor,
    private readonly cacheService: RedisCache
  ) {
    super('Kyc', cacheService);

    this.worker = new Worker(
      'Kyc',
      async (job: Job) => {
        try {
          await this.kycProcessor.process(job);
        } catch (error: any) {
          throw error;
        }
      },
      { connection: cacheService.getRedisInstance(), concurrency: 2 }
    );
  }

  async addJob(name: KycJobType, data: IKycUpdate): Promise<void> {
    await this.queue.add(name, data);
  }

  getQueue() {
    return this.queue;
  }
}
