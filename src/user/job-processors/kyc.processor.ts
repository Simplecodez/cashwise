import { Job } from 'bullmq';
import { KycJobType, KycLevel, KycStatus } from '../enum/kyc.enum';
import { inject, singleton } from 'tsyringe';
import { IKycCreate } from '../interfaces/kyc.interface';
import { IBvnService } from '../../integrations/interfaces/bvn-verification.services.interface';
import { Encryption } from '../../utils/encrypt.utils';
import { KycCrudService } from '../services/kyc/kyc-crud.service';

@singleton()
export class KycProcessor {
  constructor(
    @inject('BvnService') private readonly bvnService: IBvnService,
    private readonly kycCrudService: KycCrudService
  ) {}
  async process(job: Job<IKycCreate>): Promise<void> {
    try {
      switch (job.name) {
        case KycJobType.BVN_VERIFICATION: {
          const { bvn, userId } = job.data;

          const verificationResult = await this.bvnService.verifyBvn(bvn, userId);
          const { isVerified, rejectionReason } = verificationResult;

          if (isVerified) {
            const encrytedBvn = await Encryption.encrypt(bvn);
            await this.kycCrudService.updateKycWithUser(userId, {
              bvn: encrytedBvn,
              kycLevel: KycLevel.LEVEL_1,
              status: KycStatus.APPROVED,
              levelOneVerifiedAt: new Date()
            });
          } else {
            await this.kycCrudService.update(userId, {
              rejectionReason,
              kycLevel: KycLevel.LEVEL_1,
              status: KycStatus.REJECTED
            });
          }

          break;
        }

        default:
          break;
      }
    } catch (error) {
      throw error;
    }
  }
}
