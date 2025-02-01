import { inject, singleton } from 'tsyringe';
import * as bcrypt from 'bcrypt';
import { DataSource, FindOneOptions, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { IUser } from '../../interfaces/user.interface';
import { LocalAuth } from '../../entities/local-auth.entity';
import { UserVerificationData } from '../../../auth/interface/auth.interface';
import { KycLevel } from '../../enum/kyc.enum';
import { PaginationParams } from '../../../common/pagination/pagination/pagination.args';
import { FilterQueryBuilder } from '../../../common/pagination/lib/query-builder/filter-query-builder';
import { paginate } from '../../../common/pagination/pagination/paginate';
import { formatDbQueryFilter, maskUser, maskUsers } from '../../../utils/db.utils';
import { Role } from '../../enum/user.enum';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../../common/http-codes/codes';

@singleton()
export class UserService {
  constructor(
    @inject('UserRepository') private readonly userRepository: Repository<User>,
    @inject('LocalAuthRepository')
    private readonly localAuthRepository: Repository<LocalAuth>,
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
        userToCreate.approvedKycLevel = KycLevel.LEVEL_0;

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

  async findUserByOptions(options: FindOneOptions<User>) {
    return this.userRepository.findOne(options);
  }

  async updateUser(
    conditionData: { field: string; value: string },
    dataToUpdate: Partial<User>
  ) {
    const { field, value } = conditionData;
    return this.userRepository.update({ [field]: value }, dataToUpdate);
  }

  async retrieveUserPassword(userId: string) {
    return this.localAuthRepository.findOne({ where: { userId } });
  }

  async updateUserPassword(userId: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    return this.localAuthRepository.update({ userId }, { passwordHash });
  }

  async findAllUsers(
    userRole: Role,
    paginationParams: PaginationParams,
    filterParams?: Record<string, string>
  ) {
    const columns: string[] = ['status', 'approvedKycLevel'];

    const filtersExpression = formatDbQueryFilter(columns, filterParams);

    const query = new FilterQueryBuilder(this.userRepository, 'User', filtersExpression);
    const result = await paginate(query.build(), paginationParams, 'createdAt');

    if (userRole !== Role.SUPER_ADMIN) maskUsers(result.data);

    return result;
  }

  async findOneUser(userRole: Role, userId: string) {
    const user = await this.findUserByOptions({ where: { id: userId } });
    if (!user) throw new AppError('User not found', HttpStatus.BAD_REQUEST);

    if (userRole !== Role.SUPER_ADMIN) maskUser(user);

    return user;
  }
}
