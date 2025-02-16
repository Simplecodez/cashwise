import { FindOneOptions, Repository } from 'typeorm';
import { Account } from '../../entities/account.entity';
import { inject, singleton } from 'tsyringe';
import { ExternalRecipient } from '../../entities/external-account.entity';
import { CommonUtils } from '../../../utils/common.utils';
import { PaginationParams } from '../../../common/pagination/pagination/pagination.args';
import { Role } from '../../../user/enum/user.enum';
import { formatDbQueryFilter, maskAccount, maskAccounts } from '../../../utils/db.utils';
import { FilterQueryBuilder } from '../../../common/pagination/lib/query-builder/filter-query-builder';
import { paginate } from '../../../common/pagination/pagination/paginate';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../../common/http-codes/codes';
import { AccountStatus } from '../../enum/account.enum';

@singleton()
export class AccountRetrievalService {
  constructor(
    @inject('AccountRepository') private readonly accountRepository: Repository<Account>,
    @inject('ExternalRecipient')
    private readonly externalAccountRecipientRepository: Repository<ExternalRecipient>
  ) {}

  async findOne(options: FindOneOptions<Account>) {
    return this.accountRepository.findOne(options);
  }

  async findOneExternalAccount(options: FindOneOptions<ExternalRecipient>) {
    return this.externalAccountRecipientRepository.findOne(options);
  }

  async findAll(userId: string) {
    const accounts = await this.accountRepository.find({ where: { userId } });
    const accountWithAmountInHigherCurrency = accounts.map((account) => ({
      ...account,
      balance: CommonUtils.formatCurrency(Number(account.balance))
    }));
    return accountWithAmountInHigherCurrency;
  }

  async confirmAccount(accountNumber: string) {
    const findReceiverAccountOptions: FindOneOptions<Account> = {
      where: { accountNumber: accountNumber },
      relations: ['user'],
      select: {
        id: true,
        name: true,
        user: { firstName: true, lastName: true },
        accountNumber: true
      }
    };
    return this.findOne(findReceiverAccountOptions);
  }

  async findAllAccounts(
    userRole: Role,
    paginationParams: PaginationParams,
    filterParams?: Record<string, string>
  ) {
    const columns: string[] = ['status', 'type', 'userId'];

    const filtersExpression = formatDbQueryFilter(columns, filterParams);

    const query = new FilterQueryBuilder(this.accountRepository, 'Account', filtersExpression);

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

    if (!updateResult?.affected) throw new AppError('Account not found', HttpStatus.NOT_FOUND);
  }
}
