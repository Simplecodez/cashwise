import { singleton } from 'tsyringe';
import { BeneficiaryService } from '../services/beneficiary.service';
import { Job } from 'bullmq';
import { BeneficiaryJob } from '../enum/beneficiary.enum';

@singleton()
export class BeneficiaryProcessor {
  constructor(private readonly beneficiaryService: BeneficiaryService) {}

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case BeneficiaryJob.CREATION: {
        await this.beneficiaryService.create(job.data);
        break;
      }

      case BeneficiaryJob.DELETION: {
        const { beneficiaryId, accountId, userId } = job.data;
        await this.beneficiaryService.delete(beneficiaryId, accountId, userId);
        break;
      }

      default:
        break;
    }
  }
}
