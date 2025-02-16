import { Job } from 'bullmq';
import { singleton } from 'tsyringe';
import { AccountJobType } from '../enum/account.enum';
import { AccountService } from '../services/account/account.service';
import { Logger } from '../../common/logger/logger';
import { ActivityQueue } from '../../activity/job-processor/activity.queue';
import { ActivityJobType, ActivityType } from '../../activity/enum/activity.enum';
import { maskNumberString } from '../../utils/db.utils';

@singleton()
export class AccountProcessor {
  constructor(
    private readonly accountService: AccountService,
    private readonly activityQueue: ActivityQueue,
    private readonly logger: Logger
  ) {}

  async process(job: Job): Promise<void> {
    try {
      switch (job.name) {
        case AccountJobType.CREATION: {
          const accountNumber = await this.accountService.createAccount(job.data);
          const maskedAccountNumber = maskNumberString(accountNumber);
          this.activityQueue.addJob(ActivityJobType.CREATE, {
            userId: job.data.userId,
            type: ActivityType.ACCOUNT_CREATION,
            description: `Your account with name: ${job.data.name}, account number: ${maskedAccountNumber} has been created.`
          });
          break;
        }

        case AccountJobType.EXTERNAL_ACCOUNT_CREATION: {
          await this.accountService.createExternalRecipient(job.data);
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
