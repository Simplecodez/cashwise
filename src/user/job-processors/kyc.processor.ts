import { Job } from 'bullmq';
import { KycJobType, KycLevel, KycStatus } from '../enum/kyc.enum';
import { inject, singleton } from 'tsyringe';
import { IKycUpdate } from '../interfaces/kyc.interface';
import { IBvnService } from '../../integrations/interfaces/bvn-verification.services.interface';
import { Encryption } from '../../utils/encrypt.utils';
import { KycCrudService } from '../services/kyc/kyc-crud.service';
import { AccountQueue } from '../../account/job-processor/account.queue';
import {
  AccountJobType,
  AccountStatus,
  AccountType
} from '../../account/enum/account.enum';
import { CommonUtils } from '../../utils/common.utils';
import { Account } from '../../account/entities/account.entity';

@singleton()
export class KycProcessor {
  constructor(
    @inject('BvnService') private readonly bvnService: IBvnService,
    private readonly kycCrudService: KycCrudService,
    private readonly accountQueue: AccountQueue
  ) {}
  async process(job: Job<IKycUpdate>): Promise<void> {
    try {
      switch (job.name) {
        case KycJobType.BVN_VERIFICATION: {
          const { bvn: encrytedBvn, userId } = job.data;
          const bvn = await Encryption.decrypt(encrytedBvn as string);

          const verificationResult = await this.bvnService.verifyBvn(
            bvn as string,
            userId
          );

          const { isVerified, rejectionReason } = verificationResult;

          if (isVerified) {
            await this.kycCrudService.updateKycWithUser(userId, {
              bvn: encrytedBvn,
              kycLevel: KycLevel.LEVEL_1,
              status: KycStatus.APPROVED,
              levelOneVerifiedAt: new Date()
            });

            const accountCreationData: Partial<Account> = {
              userId,
              name: CommonUtils.generateRandomAccountName(),
              balance: 0,
              type: AccountType.SAVINGS,
              status: AccountStatus.ACTIVE
            };
            this.accountQueue.addJob(AccountJobType.CREATION, accountCreationData);
          } else {
            await this.kycCrudService.update(userId, {
              rejectionReason,
              kycLevel: KycLevel.LEVEL_1,
              status: KycStatus.REJECTED
            });
          }

          break;
        }

        case KycJobType.NIN_VERIFICATION: {
          const { nin, userId } = job.data;
          // decrypt nin before verifying
          // verify nin to decide if to approve or reject
          await this.kycCrudService.updateKycWithUser(userId, {
            kycLevel: KycLevel.LEVEL_2,
            status: KycStatus.REJECTED,
            levelTwoVerifiedAt: new Date()
          });
          break;
        }

        case KycJobType.ADDRESS_VERIFICATION: {
          const { documentUrlId, userId } = job.data;
          // verify address using ML to decide if to approve or reject
          await this.kycCrudService.updateKycWithUser(userId, {
            kycLevel: KycLevel.LEVEL_3,
            status: KycStatus.REJECTED,
            levelThreeVerifiedAt: new Date()
          });
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
