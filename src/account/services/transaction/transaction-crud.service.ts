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
