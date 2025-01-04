import { singleton } from 'tsyringe';
import { KycQueue } from '../../job-processors/kyc.queue';
import { KycJobType } from '../../enum/kyc.enum';
import { KycCrudService } from './kyc-crud.service';
import { IKycCreate } from '../../interfaces/kyc.interface';

@singleton()
export class KycService {
  constructor(
    private readonly kycQueue: KycQueue,
    private readonly kycCrudService: KycCrudService
  ) {}

  async verifyBvn(data: IKycCreate) {
    await this.kycCrudService.create(data);
    this.kycQueue.addJob(KycJobType.BVN_VERIFICATION, { bvn: data.bvn });

    return 'Your BVN verification status will be sent via email';
  }
}
