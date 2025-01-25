import { Job } from 'bullmq';
import { singleton } from 'tsyringe';
import { AccountJobType } from '../enum/account.enum';
import { AccountService } from '../services/account.service';

@singleton()
export class AccountProcessor {
  constructor(private readonly accountService: AccountService) {}

  async process(job: Job): Promise<void> {
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
  }
}
