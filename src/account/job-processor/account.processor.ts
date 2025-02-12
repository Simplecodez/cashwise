import { Job } from 'bullmq';
import { singleton } from 'tsyringe';
import { AccountJobType } from '../enum/account.enum';
import { AccountService } from '../services/account/account.service';
import { Logger } from '../../common/logger/logger';

@singleton()
export class AccountProcessor {
  constructor(private readonly accountService: AccountService, private readonly logger: Logger) {}

  async process(job: Job): Promise<void> {
    try {
      switch (job.name) {
        case AccountJobType.CREATION: {
          await this.accountService.createAccount(job.data);
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
