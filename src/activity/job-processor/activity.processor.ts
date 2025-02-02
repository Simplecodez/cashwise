import { Job } from 'bullmq';
import { singleton } from 'tsyringe';
import { Logger } from '../../common/logger/logger';
import { ActivityJobType } from '../enum/activity.enum';
import { ActivityService } from '../service/activity.service';

@singleton()
export class ActivityProcessor {
  constructor(
    private readonly activityService: ActivityService,
    private readonly logger: Logger
  ) {}

  async process(job: Job): Promise<void> {
    try {
      switch (job.name) {
        case ActivityJobType.CREATE: {
          await this.activityService.create(job.data);
          break;
        }

        default:
          break;
      }
    } catch (error: any) {
      this.logger.appLogger.error(error.message, error.stack);
      throw error;
    }
  }
}
