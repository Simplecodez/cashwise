import { singleton } from 'tsyringe';
import { BaseQueue } from '../../configs/bull/bullmq.base';
import { RedisCache } from '../../configs/redis/redis.service';
import { Job, Worker } from 'bullmq';
import { ActivityJobType } from '../enum/activity.enum';
import { Activity } from '../entity/activity.entity';
import { ActivityProcessor } from './activity.processor';

@singleton()
export class ActivityQueue extends BaseQueue {
  protected worker: Worker;

  constructor(
    private readonly cacheService: RedisCache,
    private readonly activityProcessor: ActivityProcessor
  ) {
    super('Activity', cacheService);

    this.worker = new Worker(
      'Activity',
      async (job: Job) => {
        try {
          await this.activityProcessor.process(job);
        } catch (error: any) {
          throw error;
        }
      },
      { connection: cacheService.getRedisInstance(), concurrency: 2 }
    );
  }

  async addJob(name: ActivityJobType, data: Partial<Activity>): Promise<void> {
    await this.queue.add(name, data);
  }

  getQueue() {
    return this.queue;
  }
}
