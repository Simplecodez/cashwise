import { singleton } from 'tsyringe';
import { BaseQueue } from '../../configs/bull/bullmq.base';
import { RedisCache } from '../../configs/redis/redis.service';
import { Job, Worker } from 'bullmq';
import { BeneficiaryJob } from '../enum/beneficiary.enum';
import { Beneficiary } from '../entities/beneficiary.entity';
import { BeneficiaryProcessor } from './beneficiary.processor';
import { Logger } from '../../common/logger/logger';

@singleton()
export class BeneficiaryQueue extends BaseQueue {
  protected worker: Worker;

  constructor(
    private readonly logger: Logger,
    private readonly cacheService: RedisCache,
    private readonly beneficiaryProcessor: BeneficiaryProcessor
  ) {
    super('Beneficiary', cacheService);

    this.worker = new Worker(
      'Beneficiary',
      async (job: Job) => {
        try {
          await this.beneficiaryProcessor.process(job);
        } catch (error: any) {
          throw error;
        }
      },
      { connection: cacheService.getRedisInstance(), concurrency: 2 }
    );
  }

  async addJob(name: BeneficiaryJob, data: Partial<Beneficiary>): Promise<void> {
    try {
      await this.queue.add(name, data);
      this.logger.appLogger.info(
        `Beneficiary job added [${name}]: Timestamp: ${new Date().toISOString()}`
      );
    } catch (error) {
      this.logger.appLogger.info(
        `Failed adding Beneficiary job [${name}]: Timestamp: ${new Date().toISOString()}`
      );
    }
  }

  getQueue() {
    return this.queue;
  }
}
