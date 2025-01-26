import { singleton } from 'tsyringe';
import { KycQueue } from '../../job-processors/kyc.queue';
import { KycJobType, KycLevel, KycStatus } from '../../enum/kyc.enum';
import { KycCrudService } from './kyc-crud.service';
import { IKycUpdate } from '../../interfaces/kyc.interface';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../../common/http-codes/codes';
import { Kyc } from '../../entities/kyc/kyc.entity';
import { Encryption } from '../../../utils/encrypt.utils';

@singleton()
export class KycService {
  constructor(
    private readonly kycQueue: KycQueue,
    private readonly kycCrudService: KycCrudService
  ) {}

  async updateKyc(data: IKycUpdate) {
    const kycRecord = await this.kycCrudService.findOne(data.userId);
    this.checkUserKycStatus(kycRecord, data.level as KycLevel);

    const jobData = await this.createJobData(data, kycRecord?.id);

    if (data.level === KycLevel.LEVEL_1) {
      await this.kycCrudService.upsert({ userId: jobData.kycJobData.userId });
    } else {
      await this.kycCrudService.updateKycWithDocument(jobData.kycJobData);
    }

    this.kycQueue.addJob(jobData.kycJobType, jobData.kycJobData);

    return 'Your BVN verification status will be sent via email';
  }

  private checkUserKycStatus(kycRecord: Kyc | null, level: KycLevel) {
    if (kycRecord) {
      switch (kycRecord.status) {
        case KycStatus.APPROVED: {
          if (kycRecord.kycLevel === level) {
            throw new AppError(
              'Your KYC has already been approved for this level. Please proceed to the next level',
              HttpStatus.CONFLICT
            );
          }
          break;
        }

        case KycStatus.PENDING: {
          if (kycRecord.kycLevel === level) {
            throw new AppError(
              'Your KYC submission is currently under review. We will email you once completed',
              HttpStatus.ACCEPTED
            );
          }
          break;
        }
        default:
          break;
      }
    }
  }

  private async createJobData(
    data: IKycUpdate,
    kycId?: string
  ): Promise<{
    kycJobType: KycJobType;
    kycJobData: IKycUpdate;
  }> {
    const { bvn, nin, userId, documentUrlId, level, username } = data;
    if (data.level === KycLevel.LEVEL_1) {
      const encryptedBvn = await Encryption.encrypt(bvn as string);
      return {
        kycJobType: KycJobType.BVN_VERIFICATION,
        kycJobData: { bvn: encryptedBvn, userId, username }
      };
    } else if (data.level === KycLevel.LEVEL_2) {
      const encryptedNin = await Encryption.encrypt(nin as string);
      return {
        kycJobType: KycJobType.NIN_VERIFICATION,
        kycJobData: { kycId, nin: encryptedNin, userId, documentUrlId, level }
      };
    } else {
      return {
        kycJobType: KycJobType.ADDRESS_VERIFICATION,
        kycJobData: { kycId, userId, documentUrlId, level }
      };
    }
  }
}
