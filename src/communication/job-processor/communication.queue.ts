import { singleton } from 'tsyringe';
import { Job, Worker } from 'bullmq';
import { BaseQueue } from '../../configs/bull/bullmq.base';
import { RedisCache } from '../../configs/redis/redis.service';
import { CommunicationMedium } from '../communications.enum';
import { EmailType } from '../email/enum/email.enum';
import { CommunicationProcessor } from './communication.processor';

@singleton()
export class CommunicationQueue extends BaseQueue {
  protected worker: Worker;

  constructor(
    private readonly cacheService: RedisCache,
    private readonly communicationProcessor: CommunicationProcessor
  ) {
    super('Communication', cacheService);

    this.worker = new Worker(
      'Communication',
      async (job: Job) => {
        try {
          await this.communicationProcessor.process(job);
        } catch (error: any) {
          throw error;
        }
      },
      { connection: cacheService.getRedisInstance(), concurrency: 2 }
    );
  }

  async addJob(
    name: CommunicationMedium,
    data: {
      otp?: string;
      phoneNumber?: string;
      email?: string;
      emailType?: EmailType;
    }
  ): Promise<void> {
    await this.queue.add(name, data);
  }

  getQueue() {
    return this.queue;
  }
}
