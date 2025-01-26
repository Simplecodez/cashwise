import { inject, singleton } from 'tsyringe';
import { DataSource, FindOneOptions, Repository } from 'typeorm';
import { Transaction } from '../../entities/transaction.entity';
import {
  TransactionGateway,
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

@singleton()
export class TransactionCrudService {
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

  async getOneAccountTransactions(accountId: string, paginationParams: PaginationParams) {
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
          selectFields: [
            'Transaction',
            'Sender.name',
            'Sender.accountNumber',
            'Sender.username'
          ]
        },
        {
          field: 'Receiver.id',
          relationField: 'Transaction.receiverAccount',
          selectFields: ['Receiver.name', 'Receiver.accountNumber', 'Receiver.username']
        }
      ],
      operator: LogicalOperatorEnum.OR
    };
    const query = new FilterQueryBuilder<Transaction>(
      this.transactionRepository,
      'Transaction',
      filter
    );
    const result = await paginate(query.build(), paginationParams, 'createdAt');
    return result;
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
        await transactionalEntityManager.increment(
          Account,
          { id: senderAccountId },
          'balance',
          amount
        );
      }

      await transactionalEntityManager.update(
        Transaction,
        { reference },
        { session, status: transactionStatus }
      );
    });
  }

  async handleDeposit(
    reference: string,
    accountId: string,
    amount: number,
    status: TransactionStatus,
    failureReason?: string
  ) {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.update(
        Transaction,
        { reference, status: TransactionStatus.PENDING },
        { status, failureReason }
      );

      if (status === TransactionStatus.SUCCESS)
        await transactionalEntityManager.increment(
          Account,
          { id: accountId },
          'balance',
          amount
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
    const { senderAccountId, amount, receiverAccountId, reference, remark } =
      transferData;
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.decrement(
        Account,
        { id: senderAccountId },
        'balance',
        amount
      );

      await transactionalEntityManager.increment(
        Account,
        { id: receiverAccountId },
        'balance',
        amount
      );

      const newTransactionRecord = transactionalEntityManager.create(
        Transaction,
        this.generationRecord(
          senderAccountId,
          receiverAccountId,
          reference,
          amount,
          remark
        )
      );

      await transactionalEntityManager.insert(Transaction, newTransactionRecord);
    });
  }

  async handleExternalTransferDebit(
    senderAccountId: string,
    amount: number,
    transactionRecord: Partial<Transaction>
  ) {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.decrement(
        Account,
        { id: senderAccountId },
        'balance',
        amount
      );

      const newTransactionRecord = transactionalEntityManager.create(
        Transaction,
        transactionRecord
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
