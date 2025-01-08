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
        await this.accountService.create(job.data);

        break;
      }

      default:
        break;
    }
  }
}
