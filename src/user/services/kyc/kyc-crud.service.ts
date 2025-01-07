import { inject, singleton } from 'tsyringe';
import { DataSource, In, Repository } from 'typeorm';
import { Kyc } from '../../entities/kyc/kyc.entity';
import { IKycUpdate } from '../../interfaces/kyc.interface';
import { User } from '../../entities/user.entity';
import { KycDocumentType, KycLevel, KycStatus } from '../../enum/kyc.enum';
import { KycDocument } from '../../entities/kyc/kyc-document.entity';
import { UserStatus } from '../../enum/user.enum';

@singleton()
export class KycCrudService {
  constructor(
    @inject('KycRepository') private readonly kycRepository: Repository<Kyc>,
    @inject('DataSource') private readonly dataSource: DataSource
  ) {}

  // async create(data: IKycUpdate) {
  //   const newKyc = this.kycRepository.create(data);
  //   return this.kycRepository.insert(newKyc);
  // }

  async upsert(data: IKycUpdate) {
    return this.kycRepository.upsert(
      { ...data, rejectionReason: null },
      {
        conflictPaths: ['userId']
      }
    );
  }

  private getKycUpdateData(data: IKycUpdate) {
    return {
      userId: data.userId,
      kycLevel: data.level,
      status: KycStatus.PENDING
    };
  }

  async updateKycWithDocument(data: IKycUpdate) {
    const updateData = this.getKycUpdateData(data);

    return this.dataSource.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.update(Kyc, { userId: data.userId }, updateData);
      const newkycDocument = transactionalEntityManager.create(KycDocument, {
        kycId: data.kycId,
        documentType:
          updateData.kycLevel === KycLevel.LEVEL_2
            ? KycDocumentType.NIN
            : KycDocumentType.PROOF_OF_ADDRESS,
        documentUrlId: data.documentUrlId
      });

      await transactionalEntityManager.insert(KycDocument, newkycDocument);
    });
  }

  async updateKycWithUser(userId: string, data: Partial<Kyc>) {
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.update(Kyc, { userId }, data);
      await transactionalEntityManager.update(
        User,
        { id: userId },
        { approvedKycLevel: data.kycLevel, status: UserStatus.ACTIVE }
      );
    });
  }

  async update(userId: string, data: Partial<Kyc>) {
    return this.kycRepository.update({ userId }, data);
  }

  async findOne(userId: string) {
    return this.kycRepository.findOne({
      where: {
        userId
      }
    });
  }
}
