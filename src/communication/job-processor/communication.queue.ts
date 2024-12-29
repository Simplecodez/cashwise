import { singleton } from 'tsyringe';
import { Job, Worker } from 'bullmq';
import { BaseQueue } from '../../configs/bull/bullmq.base';
import { RedisCache } from '../../configs/redis/redis.service';
import { CommunicationMedium } from '../communications.enum';
import { CommunicationService } from '../communications.service';
import { EmailType } from '../email/enum/email.enum';

@singleton()
export class CommunicationQueue extends BaseQueue {
  protected worker: Worker;

  constructor(
    private readonly communicationService: CommunicationService,
    private readonly cacheService: RedisCache
  ) {
    super('Communication', cacheService);

    this.worker = new Worker(
      'Communication',
      async (job: Job) => {
        try {
          await this.jobHandler(job);
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

  protected async jobHandler(job: Job): Promise<void> {
    switch (job.name) {
      case CommunicationMedium.EMAIL: {
        try {
          await this.communicationService.sendEmail(job.data);
        } catch (error) {
          console.log(error);
          throw error;
        }
        break;
      }

      case CommunicationMedium.SMS: {
        try {
          await this.communicationService.sendSMS(job.data.phoneNumber);
        } catch (error) {
          console.log(error);
          throw error;
        }
        break;
      }

      default:
        break;
    }
  }

  getQueue() {
    return this.queue;
  }
}
