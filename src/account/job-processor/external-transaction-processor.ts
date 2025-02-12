import { inject, singleton } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from '../entities/transaction.entity';
import {
  TransactionDepositData,
  TransactionGateway,
  TransactionOrigin,
  TransactionStatus,
  TransactionType
} from '../enum/transaction.enum';
import { DataSource, FindOneOptions, Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { AccountService } from '../services/account/account.service';
import { PaymentService } from '../../integrations/payments/services/payment.service';
import { AccountQueue } from './account.queue';
import { Logger } from '../../common/logger/logger';
import { PaymentProvider } from '../../integrations/payments/enum/payment.enum';
import { ExternalRecipient } from '../entities/external-account.entity';
import { AccountJobType } from '../enum/account.enum';
import { HttpStatus } from '../../common/http-codes/codes';
import { AppError } from '../../utils/app-error.utils';

@singleton()
export class ExternalTransactionProcessorService {
  constructor(
    @inject('DataSource') private readonly datasource: DataSource,
    @inject('TransactionRepository') private readonly transactionRepository: Repository<Transaction>,
    private readonly accountService: AccountService,
    private readonly paymentService: PaymentService,
    private readonly accountQueue: AccountQueue,
    private readonly logger: Logger
  ) {}

  async processDeposit(transactionData: TransactionDepositData) {
    const { status, amount, reference } = transactionData;
    if (status && amount && reference) {
      const options: FindOneOptions<Transaction> = {
        where: { reference, status: TransactionStatus.PENDING }
      };

      const transactionRecord = await this.transactionRepository.findOne(options);

      if (!transactionRecord) {
        this.logger.appLogger.warn(`Transaction not found, ref: ${reference}`);
        return { error: 'Transaction not found', code: HttpStatus.NOT_FOUND };
      }

      if (+transactionRecord.amount !== amount) {
        await this.creditAccount(
          reference,
          transactionRecord.receiverAccountId,
          +transactionRecord.amount,
          TransactionStatus.FAILED,
          'Amount Mismatch'
        );
        this.logger.appLogger.warn(`Amount mismatch, ref: ${reference}`);
        return { error: 'Amount Mismatch', code: HttpStatus.BAD_REQUEST };
      }

      const transactionStatus = status === 'success' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;

      await this.creditAccount(
        reference,
        transactionRecord.receiverAccountId,
        +transactionRecord.amount,
        transactionStatus,
        transactionStatus === TransactionStatus.FAILED ? status : undefined
      );

      return 'Verified';
    }
  }

  private async creditAccount(
    reference: string,
    accountId: string,
    amount: number,
    status: TransactionStatus,
    failureReason?: string
  ) {
    return this.datasource.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.update(
        Transaction,
        { reference, status: TransactionStatus.PENDING },
        { status, failureReason }
      );

      if (status === TransactionStatus.SUCCESS)
        await transactionalEntityManager.increment(Account, { id: accountId }, 'balance', amount);
    });
  }

  private async debitAccount(
    senderAccountId: string,
    amount: number,
    transactionRecord: Partial<Transaction>
  ) {
    return this.datasource.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.decrement(Account, { id: senderAccountId }, 'balance', amount);

      const newTransactionRecord = transactionalEntityManager.create(Transaction, transactionRecord);

      await transactionalEntityManager.insert(Transaction, newTransactionRecord);
    });
  }

  async processExternalTransfer(transferData: {
    senderAccountId: string;
    receiverName: string;
    accountNumber: string;
    bankCode: string;
    amount: number;
    remark?: string;
  }) {
    const { senderAccountId, receiverName, accountNumber, bankCode, amount, remark } = transferData;
    const externalAccountRecipient = await this.accountService.findOneExternalAccount({
      where: { bankCode, accountNumber }
    });

    let { recipientCode, bankName, accountName } = externalAccountRecipient || {};

    if (!externalAccountRecipient) {
      const result = await this.handleExternalRecipientCreation(receiverName, accountNumber, bankCode);
      recipientCode = result.recipientCode;
      bankName = result.bankName;
      accountName = result.accountName;
    }

    const reference = this.generateReference();

    const transactionRecord = this.generateTransactionRecord(
      senderAccountId,
      amount,
      bankName as string,
      accountName as string,
      accountNumber,
      reference,
      remark
    );

    await this.debitAccount(senderAccountId, amount, transactionRecord);

    // Works but needs a registered business Paystack account
    // await this.paymentService.initiateExternalTransfer(amount, recipientCode as string, reference, remark);

    this.logger.appLogger.info(
      `Successful external transfer initialization: Provider: ${
        PaymentProvider.PAYSTACK
      }, Timestamp: ${new Date().toISOString()}`
    );

    return 'Transaction successful'; // returned for now, will bw removed once Paystack account is resolved
  }

  async handleExternalRecipientCreation(customerName: string, accountNumber: string, bankCode: string) {
    const recipient = await this.paymentService.createExternalTransferRecipient(
      customerName,
      accountNumber,
      bankCode
    );

    const { active, details, recipient_code } = recipient.data.data;
    const { account_number, account_name, bank_code, bank_name } = details;

    if (!active) {
      this.logger.appLogger.error(
        `External transfer failed: Provider: ${
          PaymentProvider.PAYSTACK
        }, Reason: Inactive account number, Timestamp: ${new Date().toISOString()}`
      );
      throw new AppError('Invalid account number', HttpStatus.BAD_REQUEST);
    }

    this.accountQueue.addJob(AccountJobType.EXTERNAL_ACCOUNT_CREATION, {
      accountName: account_name,
      accountNumber: account_number,
      recipientCode: recipient_code,
      bankCode: bank_code,
      bankName: bank_name
    } as Partial<ExternalRecipient>);

    return {
      recipientCode: recipient_code,
      bankName: bank_name,
      accountName: account_name
    };
  }

  generateTransactionRecord(
    senderAccountId: string,
    amount: number,
    bank: string,
    recipientName: string,
    accountNumber: string,
    reference: string,
    remark?: string
  ): Partial<Transaction> {
    return {
      senderAccountId,
      externalReceiverDetails: {
        name: recipientName,
        bank,
        accountNumber
      },
      reference,
      amount,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.SUCCESS, // Will be changed to pending when a registered Paystack business account is available
      origin: TransactionOrigin.INTERNAL,
      gateway: TransactionGateway.PAYSTACK,
      remark
    };
  }

  private generateReference() {
    return uuidv4();
  }
}
