import { inject, singleton } from 'tsyringe';
import { DataSource, FindOneOptions, Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../enum/transaction.enum';
import { Account } from '../entities/account.entity';

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

  async updateOne(
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
}
