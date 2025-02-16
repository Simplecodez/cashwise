import { inject, singleton } from 'tsyringe';
import { DataSource, Repository } from 'typeorm';
import { Transaction } from '../../entities/transaction.entity';
import {
  TransactionDepositData,
  transactionLimit,
  TransactionStatus
} from '../../enum/transaction.enum';
import { Logger } from '../../../common/logger/logger';
import { HttpStatus } from '../../../common/http-codes/codes';
import { Account } from '../../entities/account.entity';
import { AppError } from '../../../utils/app-error.utils';
import { AccountStatus } from '../../enum/account.enum';
import { User } from '../../../user/entities/user.entity';

@singleton()
export class TransactionDepositService {
  private readonly ACCOUNT_CREDIT_LIMIT_FACTOR = 3;

  constructor(
    @inject('DataSource') private readonly datasource: DataSource,
    @inject('TransactionRepository')
    private readonly transactionRepository: Repository<Transaction>,
    private readonly logger: Logger
  ) {}

  async processDeposit(transactionData: TransactionDepositData) {
    let accountCreditResult: { isSuspended: boolean; receiverAccount: Account | null } | null =
      null;
    const { status, amount, reference } = transactionData;
    if (status && amount && reference) {
      const transactionRecord = await this.transactionRepository.findOne({
        where: { reference, status: TransactionStatus.PENDING }
      });

      if (!transactionRecord) {
        this.logger.appLogger.warn(`Deposit failed: Transaction not found, ref: ${reference}`);
        throw new AppError('Transaction not found', HttpStatus.NOT_FOUND);
      }

      if (Number(transactionRecord.amount) !== amount) {
        await this.creditAccountAndUpdatedTransaction(
          reference,
          transactionRecord.receiverAccountId,
          +transactionRecord.amount,
          TransactionStatus.FAILED,
          'Amount Mismatch'
        );
        this.logger.appLogger.warn(`Deposit failed: Amount mismatch, ref: ${reference}`);
        throw new AppError('Amount Mismatch', HttpStatus.BAD_REQUEST);
      }

      const transactionStatus =
        status === 'success' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;

      accountCreditResult = await this.creditAccountAndUpdatedTransaction(
        reference,
        transactionRecord.receiverAccountId,
        Number(transactionRecord.amount),
        transactionStatus,
        transactionStatus === TransactionStatus.FAILED ? status : undefined
      );
    }
    return accountCreditResult;
  }

  private async creditAccountAndUpdatedTransaction(
    reference: string,
    receiverAccountId: string,
    amount: number,
    status: TransactionStatus,
    failureReason?: string
  ) {
    return this.datasource.transaction(async (transactionalEntityManager) => {
      let shouldSuspendAccount = false;
      let receiverAccount: Account | null = null;

      if (status === TransactionStatus.SUCCESS) {
        receiverAccount = await transactionalEntityManager.findOne(Account, {
          where: { id: receiverAccountId },
          select: {
            id: true,
            balance: true,
            userId: true,
            name: true,
            accountNumber: true
          },
          lock: { mode: 'pessimistic_write' }
        });

        if (!receiverAccount) {
          throw new AppError('Receiver account not found', HttpStatus.NOT_FOUND);
        }

        const receiver = await transactionalEntityManager.findOne(User, {
          where: { id: receiverAccount.userId },
          select: {
            id: true,
            approvedKycLevel: true
          }
        });

        const newReceiverBalance = Number(receiverAccount.balance) + amount;
        const accountLimitOnCredit =
          transactionLimit[(receiver as User).approvedKycLevel] * this.ACCOUNT_CREDIT_LIMIT_FACTOR;
        shouldSuspendAccount = newReceiverBalance >= accountLimitOnCredit;

        await transactionalEntityManager.update(
          Account,
          { id: receiverAccountId },
          {
            balance: newReceiverBalance,
            ...(shouldSuspendAccount ? { status: AccountStatus.SUSPENDED } : {})
          }
        );
      }

      await transactionalEntityManager.update(
        Transaction,
        { reference, status: TransactionStatus.PENDING },
        { status, failureReason }
      );

      return {
        isSuspended: shouldSuspendAccount && status === TransactionStatus.SUCCESS,
        receiverAccount
      };
    });
  }
}
