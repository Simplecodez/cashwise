import { inject, singleton } from 'tsyringe';
import { FindOneOptions, Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { createHash, randomBytes } from 'crypto';
import { ExternalRecipient } from '../entities/external-account.entity';
import { Role } from '../../user/enum/user.enum';
import { PaginationParams } from '../../common/pagination/pagination/pagination.args';
import { formatDbQueryFilter, maskAccount, maskAccounts } from '../../utils/db.utils';
import { FilterQueryBuilder } from '../../common/pagination/lib/query-builder/filter-query-builder';
import { paginate } from '../../common/pagination/pagination/paginate';
import { HttpStatus } from '../../common/http-codes/codes';
import { AppError } from '../../utils/app-error.utils';
import { AccountStatus } from '../enum/account.enum';

@singleton()
export class AccountService {
  constructor(
    @inject('AccountRepository') private readonly accountRepository: Repository<Account>,
    @inject('ExternalRecipient')
    private readonly externalAccountRecipientRepository: Repository<ExternalRecipient>
  ) {}

  async createAccount(data: Partial<Account>) {
    const accountNumber = await this.generateAccountNumber();
    const newAccount = this.accountRepository.create({ ...data, accountNumber });
    return this.accountRepository.insert(newAccount);
  }

  async createExternalRecipient(data: Partial<ExternalRecipient>) {
    const newExternalRecipient = this.externalAccountRecipientRepository.create(data);
    return this.externalAccountRecipientRepository.insert(newExternalRecipient);
  }

  async findOne(options: FindOneOptions<Account>) {
    return this.accountRepository.findOne(options);
  }

  async findOneExternalAccount(options: FindOneOptions<ExternalRecipient>) {
    return this.externalAccountRecipientRepository.findOne(options);
  }

  async confirmAccount(accountNumber: string) {
    return this.accountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.user', 'user')
      .select(['account.name', 'user.firstName', 'user.lastName'])
      .where('account.accountNumber = :accountNumber', { accountNumber })
      .getOne();
  }

  async findAll(userId: string) {
    const accounts = await this.accountRepository.find({ where: { userId } });
    const accountWithAmountInHigherCurrency = accounts.map((account) => ({
      ...account,
      balance: (account.balance / 100).toFixed(2)
    }));
    return accountWithAmountInHigherCurrency;
  }

  async findAllAccounts(
    userRole: Role,
    paginationParams: PaginationParams,
    filterParams?: Record<string, string>
  ) {
    const columns: string[] = ['status', 'type', 'userId'];

    const filtersExpression = formatDbQueryFilter(columns, filterParams);

    const query = new FilterQueryBuilder(
      this.accountRepository,
      'Account',
      filtersExpression
    );

    const result = await paginate(query.build(), paginationParams, 'createdAt');

    if (userRole !== Role.SUPER_ADMIN) maskAccounts(result.data);

    return result;
  }

  async findOneAccount(userRole: Role, accountId: string) {
    const account = await this.findOne({ where: { id: accountId } });
    if (!account) throw new AppError('Account not found', HttpStatus.BAD_REQUEST);

    if (userRole !== Role.SUPER_ADMIN) maskAccount(account);

    return account;
  }

  async freezeAccount(accountId: string) {
    const updateResult = await this.accountRepository.update(
      { id: accountId },
      { status: AccountStatus.SUSPENDED }
    );

    if (!updateResult?.affected)
      throw new AppError('Account not found', HttpStatus.NOT_FOUND);
  }

  private async generateAccountNumber(): Promise<string> {
    let exists = false;
    let checkCount = 0;
    let accountNumber = '';

    do {
      const timestamp = Date.now().toString();
      const random = randomBytes(8).toString('hex');
      const combined = `${timestamp}${random}`;

      const hash = createHash('sha256').update(combined).digest('hex');

      accountNumber = hash.replace(/\D/g, '').slice(0, 10);
      const options: FindOneOptions<Account> = {
        where: {
          accountNumber
        }
      };
      exists = (await this.findOne(options)) !== null;
      checkCount++;
    } while (exists && checkCount < 3);

    return accountNumber;
  }
}
