import { inject, singleton } from 'tsyringe';
import { DataSource, FindOneOptions, Repository } from 'typeorm';
import { Transaction } from '../../entities/transaction.entity';
import {
  TransactionGateway,
  transactionLimit,
  TransactionOrigin,
  TransactionStatus,
  TransactionType
} from '../../enum/transaction.enum';
import { Account } from '../../entities/account.entity';
import { PaginationParams } from '../../../common/pagination/pagination/pagination.args';
import { FiltersExpression } from '../../../common/pagination/lib/interface/filters-expression.input';
import { ComparisonOperatorEnum } from '../../../common/pagination/lib/enum/comparison-operator.enum';
import { LogicalOperatorEnum } from '../../../common/pagination/lib/enum/logical-operator.enum';
import { FilterQueryBuilder } from '../../../common/pagination/lib/query-builder/filter-query-builder';
import { paginate } from '../../../common/pagination/pagination/paginate';
import { Role } from '../../../user/enum/user.enum';
import { formatDbQueryFilter, maskTransactions } from '../../../utils/db.utils';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../../common/http-codes/codes';
import { AccountStatus } from '../../enum/account.enum';

@singleton()
export class TransactionCrudService {
  private readonly accountCreditLimitFactor = 3;
  constructor(
    @inject('TransactionRepository')
    private readonly transactionRepository: Repository<Transaction>,
    @inject('DataSource') private readonly dataSource: DataSource
  ) {}

  async create(transactionData: Partial<Transaction>) {
    const newRecord = this.transactionRepository.create(transactionData);
    return this.transactionRepository.insert(newRecord);
  }

  async findOne(options: FindOneOptions<Transaction>) {
    return this.transactionRepository.findOne(options);
  }

  async calculateDailyTotalSuccessTransfer(senderAccountId: string) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.senderAccountId = :senderAccountId', { senderAccountId })
      .andWhere('transaction.status = :status', { status: TransactionStatus.SUCCESS })
      .andWhere('transaction.createdAt BETWEEN :startOfDay AND :endOfDay', {
        startOfDay,
        endOfDay
      })
      .getRawOne();

    return parseFloat(result?.total || 0);
  }

  async updateExternalTransferTransactionStatus(
    senderAccountId: string,
    transactionStatus: TransactionStatus,
    amount: number,
    reference: string,
    session: {}
  ) {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      if (transactionStatus !== TransactionStatus.SUCCESS) {
        await transactionalEntityManager.increment(Account, { id: senderAccountId }, 'balance', amount);
      }

      await transactionalEntityManager.update(
        Transaction,
        { reference },
        { session, status: transactionStatus }
      );
    });
  }

  async handleInternalTransfer(transferData: {
    senderAccountId: string;
    amount: number;
    receiverAccountId: string;
    reference: string;
    remark?: string;
  }) {
    const { senderAccountId, amount, receiverAccountId, reference, remark } = transferData;

    return this.dataSource.transaction(async (transactionalEntityManager) => {
      let isGreaterThanOrEqualTo3xAccountLimit = false;

      const receiverAccount = await transactionalEntityManager.findOne(Account, {
        where: { id: receiverAccountId },
        select: {
          balance: true,
          user: {
            approvedKycLevel: true
          }
        }
      });

      if (!receiverAccount) throw new AppError('Receiver not found', HttpStatus.NOT_FOUND);

      const newReceiverBalance = Number(receiverAccount.balance) + amount;
      const accountLimitOnCredit =
        transactionLimit[receiverAccount.user.approvedKycLevel] * this.accountCreditLimitFactor;

      const shouldSuspendAccount = newReceiverBalance >= accountLimitOnCredit;

      // await transactionalEntityManager.update(
      //   Account,
      //   { id: senderAccountId },
      //   { balance: senderAccount.balance - amount }
      // );
      // await transactionalEntityManager.update(
      //   Account,
      //   { id: receiverAccountId },
      //   { balance: newBalance }
      // );

      // Suspend account if necessary
      if (shouldSuspendAccount) {
        await transactionalEntityManager.update(
          Account,
          { id: receiverAccountId },
          { status: AccountStatus.SUSPENDED }
        );
      }

      if (
        receiverAccount.balance + amount >=
        this.accountCreditLimitFactor * transactionLimit[receiverAccount.user.approvedKycLevel]
      )
        isGreaterThanOrEqualTo3xAccountLimit = true;

      await transactionalEntityManager.decrement(Account, { id: senderAccountId }, 'balance', amount);

      await transactionalEntityManager.increment(Account, { id: receiverAccountId }, 'balance', amount);

      // if (isGreaterThanOrEqualTo3xAccountLimit)
      //   await transactionalEntityManager.update(
      //     Account,
      //     { id: receiverAccountId },
      //     { status: AccountStatus.SUSPENDED }
      //   );

      const newTransactionRecord = transactionalEntityManager.create(
        Transaction,
        this.generationRecord(senderAccountId, receiverAccountId, reference, amount, remark)
      );

      await transactionalEntityManager.insert(Transaction, newTransactionRecord);
    });
  }

  generationRecord(
    senderAccountId: string,
    receiverAccountId: string,
    reference: string,
    amount: number,
    remark?: string
  ): Partial<Transaction> {
    return {
      senderAccountId,
      receiverAccountId,
      reference,
      amount,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.SUCCESS,
      origin: TransactionOrigin.INTERNAL,
      gateway: TransactionGateway.NONE,
      remark
    };
  }
}
