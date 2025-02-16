import { inject, singleton } from 'tsyringe';
import { formatDbQueryFilter, maskTransactions } from '../../../utils/db.utils';
import { Role } from '../../../user/enum/user.enum';
import { PaginationParams } from '../../../common/pagination/pagination/pagination.args';
import { FilterQueryBuilder } from '../../../common/pagination/lib/query-builder/filter-query-builder';
import { Repository } from 'typeorm';
import { paginate } from '../../../common/pagination/pagination/paginate';
import { Transaction } from '../../entities/transaction.entity';
import { FiltersExpression } from '../../../common/pagination/lib/interface/filters-expression.input';
import { ComparisonOperatorEnum } from '../../../common/pagination/lib/enum/comparison-operator.enum';
import { LogicalOperatorEnum } from '../../../common/pagination/lib/enum/logical-operator.enum';
import { AccountService } from '../account/account.service';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../../common/http-codes/codes';

@singleton()
export class TransactionRetrievalService {
  constructor(
    @inject('TransactionRepository') private readonly transactionRepository: Repository<Transaction>,
    private readonly accountService: AccountService
  ) {}

  private async validateAccountOwnership(userId: string, accountId: string) {
    const account = await this.accountService.findOne({
      where: { id: accountId, userId }
    });

    if (!account) throw new AppError('Invalid account', HttpStatus.NOT_FOUND);
  }

  async getTransactions(
    userRole: Role,
    paginationParams: PaginationParams,
    parsedFilter?: Record<string, string>
  ) {
    const columns: string[] = ['status', 'type', 'reference'];

    const filtersExpression = formatDbQueryFilter(columns, parsedFilter) || {
      filters: []
    };

    filtersExpression.filters?.push(
      {
        field: 'Sender.id',
        relationField: 'Transaction.senderAccount',
        selectFields: ['Transaction', 'Sender.name', 'Sender.accountNumber', 'Sender.username']
      },
      {
        field: 'Receiver.id',
        relationField: 'Transaction.receiverAccount',
        selectFields: ['Receiver.name', 'Receiver.accountNumber', 'Receiver.username']
      }
    );

    const query = new FilterQueryBuilder(this.transactionRepository, 'Transaction', filtersExpression);

    const result = await paginate(query.build(), paginationParams, 'createdAt');

    if (userRole !== Role.SUPER_ADMIN) maskTransactions(result.data);

    return result;
  }

  async findOneTransaction(userId: string, accountId: string, reference: string) {
    await this.validateAccountOwnership(userId, accountId);

    const transaction = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.senderAccount', 'senderAccount')
      .leftJoinAndSelect('transaction.receiverAccount', 'receiverAccount')
      .select([
        'transaction',
        'senderAccount.name',
        'senderAccount.username',
        'senderAccount.accountNumber',
        'receiverAccount.name',
        'receiverAccount.username',
        'receiverAccount.accountNumber'
      ])
      .where(
        '(transaction.receiverAccountId = :accountId AND transaction.reference = :reference) ' +
          'OR (transaction.senderAccountId = :accountId AND transaction.reference = :reference)',
        { reference, accountId }
      )
      .getOne();

    if (!transaction) throw new AppError('Transaction not found', HttpStatus.NOT_FOUND);

    return transaction;
  }

  async getAccountTransactions(userId: string, accountId: string, paginationParams: PaginationParams) {
    await this.validateAccountOwnership(userId, accountId);

    const filter: FiltersExpression = {
      filters: [
        {
          field: 'senderAccountId',
          operator: ComparisonOperatorEnum.EQUAL,
          value: accountId
        },
        {
          field: 'receiverAccountId',
          operator: ComparisonOperatorEnum.EQUAL,
          value: accountId
        },
        {
          field: 'Sender.id',
          relationField: 'Transaction.senderAccount',
          selectFields: ['Transaction', 'Sender.name', 'Sender.accountNumber', 'Sender.username']
        },
        {
          field: 'Receiver.id',
          relationField: 'Transaction.receiverAccount',
          selectFields: ['Receiver.name', 'Receiver.accountNumber', 'Receiver.username']
        }
      ],
      operator: LogicalOperatorEnum.OR
    };
    const query = new FilterQueryBuilder<Transaction>(this.transactionRepository, 'Transaction', filter);
    const result = await paginate(query.build(), paginationParams, 'createdAt');
    return result;
  }
}
