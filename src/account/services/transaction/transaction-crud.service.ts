import { inject, singleton } from "tsyringe";
import { DataSource, FindOneOptions, Repository } from "typeorm";
import { Transaction } from "../../entities/transaction.entity";
import {
  TransactionGateway,
  TransactionOrigin,
  TransactionStatus,
  TransactionType,
} from "../../enum/transaction.enum";
import { Account } from "../../entities/account.entity";

@singleton()
export class TransactionCrudService {
  constructor(
    @inject("TransactionRepository")
    private readonly transactionRepository: Repository<Transaction>,
    @inject("DataSource") private readonly dataSource: DataSource
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
      .createQueryBuilder("transaction")
      .select("SUM(transaction.amount)", "total")
      .where("transaction.senderAccountId = :senderAccountId", {
        senderAccountId,
      })
      .andWhere("transaction.status = :status", {
        status: TransactionStatus.SUCCESS,
      })
      .andWhere("transaction.createdAt BETWEEN :startOfDay AND :endOfDay", {
        startOfDay,
        endOfDay,
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
          "balance",
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
}
