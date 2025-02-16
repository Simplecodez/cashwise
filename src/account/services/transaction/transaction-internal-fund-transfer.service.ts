import { inject, singleton } from 'tsyringe';
import { DataSource, EntityManager, In, MoreThan, Repository } from 'typeorm';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../../common/http-codes/codes';
import { AccountStatus } from '../../enum/account.enum';
import { Account } from '../../entities/account.entity';
import { Logger } from '../../../common/logger/logger';
import {
  TransactionGateway,
  transactionLimit,
  TransactionOrigin,
  TransactionStatus,
  TransactionType
} from '../../enum/transaction.enum';
import { Transaction } from '../../entities/transaction.entity';
import { User } from '../../../user/entities/user.entity';

@singleton()
export class TransactionInternalFundTransferService {
  private readonly ACCOUNT_CREDIT_LIMIT_FACTOR = 3;
  private readonly MINIMUM_ACCOUNT_BALANCE = 10000;

  constructor(
    @inject('DataSource') private readonly datasource: DataSource,
    @inject('TransactionRepository')
    private readonly transactionRepository: Repository<Transaction>,
    private readonly logger: Logger
  ) {}

  private async getSenderAndReceiverAccounts(
    transactionalEntityManager: EntityManager,
    senderAccountId: string,
    receiverAccountId: string
  ) {
    const accountIds = [senderAccountId, receiverAccountId];
    const senderAndReceiverAccounts = await transactionalEntityManager.find(Account, {
      where: { id: In(accountIds) },
      select: {
        id: true,
        balance: true,
        userId: true,
        name: true,
        accountNumber: true
      },
      lock: { mode: 'pessimistic_write' },
      order: { id: 'ASC' }
    });

    const senderAccount = senderAndReceiverAccounts.find(
      (account) => account.id === senderAccountId
    );
    const receiverAccount = senderAndReceiverAccounts.find(
      (account) => account.id === receiverAccountId
    );

    if (!receiverAccount || !senderAccount)
      throw new AppError('Receiver or Sender not found', HttpStatus.NOT_FOUND);

    const receiver = await transactionalEntityManager.findOne(User, {
      where: { id: receiverAccount.userId },
      select: {
        id: true,
        approvedKycLevel: true
      }
    });

    return { senderAccount, receiverAccount, receiver: receiver as User };
  }

  async transferFunds(transferData: {
    senderAccountId: string;
    amount: number;
    receiverAccountId: string;
    reference: string;
    remark?: string;
  }) {
    const { senderAccountId, amount, receiverAccountId, reference, remark } = transferData;

    const transactionRecord = await this.transactionRepository.findOne({
      where: { reference }
    });
    if (transactionRecord) throw new AppError('Duplicate transaction', HttpStatus.BAD_REQUEST);

    return this.datasource.transaction(async (transactionalEntityManager) => {
      const requiredAvailableFunds = amount + this.MINIMUM_ACCOUNT_BALANCE;

      const { senderAccount, receiverAccount, receiver } = await this.getSenderAndReceiverAccounts(
        transactionalEntityManager,
        senderAccountId,
        receiverAccountId
      );

      const newReceiverBalance = Number(receiverAccount.balance) + amount;
      const newSenderBalance = Number(senderAccount.balance) - amount;
      const receiverAccountKycLevel = receiver.approvedKycLevel;
      const accountLimitOnCredit =
        transactionLimit[receiverAccountKycLevel] * this.ACCOUNT_CREDIT_LIMIT_FACTOR;
      const shouldSuspendAccount = newReceiverBalance >= accountLimitOnCredit;

      const updatedSenderAccountResult = await transactionalEntityManager.update(
        Account,
        { id: senderAccountId, balance: MoreThan(requiredAvailableFunds) },
        { balance: newSenderBalance }
      );

      if (updatedSenderAccountResult.affected === 0) {
        this.logAccountWarning(senderAccountId, 'Insufficient Account Balance');
        throw new AppError('Insufficient account balance', HttpStatus.BAD_REQUEST);
      }

      await transactionalEntityManager.update(
        Account,
        { id: receiverAccountId },
        {
          balance: newReceiverBalance,
          ...(shouldSuspendAccount ? { status: AccountStatus.SUSPENDED } : {})
        }
      );

      await this.saveTransactionRecord(
        transactionalEntityManager,
        senderAccountId,
        receiverAccountId,
        reference,
        amount,
        remark
      );

      return { isSuspended: shouldSuspendAccount, receiverAccount };
    });
  }

  private async saveTransactionRecord(
    transactionalEntityManager: EntityManager,
    senderAccountId: string,
    receiverAccountId: string,
    reference: string,
    amount: number,
    remark?: string
  ) {
    const newTransactionRecord = transactionalEntityManager.create(Transaction, {
      senderAccountId,
      receiverAccountId,
      reference,
      amount,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.SUCCESS,
      origin: TransactionOrigin.INTERNAL,
      gateway: TransactionGateway.NONE,
      remark
    });

    await transactionalEntityManager.insert(Transaction, newTransactionRecord);
  }

  private logAccountWarning(accountId: string, reason: string) {
    this.logger.appLogger.warn(
      `Transfer failed: User ID ${accountId}. Reason: ${reason}. Timestamp: ${new Date().toISOString()}`
    );
  }
}
