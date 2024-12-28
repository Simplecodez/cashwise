import { inject, singleton } from 'tsyringe';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { IUser } from '../interfaces/user.interface';
import { LocalAuth } from '../entities/local-auth.entity';
import { UserVerificationData } from '../../auth/interface/auth.interface';

@singleton()
export class UserService {
  constructor(
    @inject('UserRepository') private readonly userRepository: Repository<User>,
    @inject('DataSource') private readonly dataSource: DataSource
  ) {}

  async createUser(userData: IUser, userVerificationData: UserVerificationData) {
    const { password, ...remainingUserData } = userData;
    const newUser = await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        const userToCreate = transactionalEntityManager.create(User, remainingUserData);

        userToCreate.phoneNumber = userVerificationData.phoneNumber;
        userToCreate.countryCode = userVerificationData.countryCode;
        userToCreate.phoneNumberVerifiedAt = new Date(userVerificationData.createdAt);

        const insertResult = await transactionalEntityManager.insert(User, userToCreate);

        const localauthData = transactionalEntityManager.create(LocalAuth, {
          passwordHash: password,
          userId: insertResult.identifiers[0].id
        });
        await transactionalEntityManager.insert(LocalAuth, localauthData);

        userToCreate.id = insertResult.identifiers[0].id;
        return userToCreate;
      }
    );

    return newUser;
  }

  async findUserByField(field: string, value: string) {
    return this.userRepository.findOne({ where: { [field]: value } });
  }

  async updateUser(
    conditionData: { field: string; value: string },
    dataToUpdate: Partial<User>
  ) {
    const { field, value } = conditionData;
    return this.userRepository.update({ [field]: value }, dataToUpdate);
  }
}
