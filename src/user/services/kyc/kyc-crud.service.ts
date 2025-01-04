import { inject, singleton } from 'tsyringe';
import { DataSource, Repository } from 'typeorm';
import { Kyc } from '../../entities/kyc/kyc.entity';
import { IKycCreate } from '../../interfaces/kyc.interface';
import { User } from '../../entities/user.entity';

@singleton()
export class KycCrudService {
  constructor(
    @inject('KycRepository') private readonly kycRepository: Repository<Kyc>,
    @inject('DataSource') private readonly dataSource: DataSource
  ) {}

  async create(data: IKycCreate) {
    const newKyc = this.kycRepository.create(data);
    return this.kycRepository.insert(newKyc);
  }

  async updateKycWithUser(userId: string, data: Partial<Kyc>) {
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.update(Kyc, { userId }, data);
      await transactionalEntityManager.update(
        User,
        { id: userId },
        { approvedKycLevel: data.kycLevel }
      );
    });
  }

  async update(userId: string, data: Partial<Kyc>) {
    return this.kycRepository.update({ userId }, data);
  }
}
