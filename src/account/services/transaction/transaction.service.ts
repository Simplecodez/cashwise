import { singleton } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { TransactionCrudService } from './transaction-crud.service';
import { FindOneOptions } from 'typeorm';
import { PaymentService } from '../../../integrations/payments/services/payment.service';
import { AccountService } from '../account.service';
import { TransactionQueue } from '../../job-processor/transaction.queue';
import { PaymentProvider } from '../../../integrations/payments/enum/payment.enum';
import { HttpStatus } from '../../../common/http-codes/codes';
import { AppError } from '../../../utils/app-error.utils';
import {
  TransactionGateway,
  TransactionJobType,
  transactionLimit,
  TransactionOrigin,
  TransactionStatus,
  TransactionType
} from '../../enum/transaction.enum';
import { Transaction } from '../../entities/transaction.entity';
import { Account } from '../../entities/account.entity';
import { AccountQueue } from '../../job-processor/account.queue';
import { AccountJobType, AccountStatus } from '../../enum/account.enum';
import { ExternalRecipient } from '../../entities/external-account.entity';
import { ExternalTransactionService } from './external-transaction.service';
import { KycLevel } from '../../../user/enum/kyc.enum';
import { PaginationParams } from '../../../common/pagination/pagination/pagination.args';
import { Role } from '../../../user/enum/user.enum';
import { Logger } from '../../../common/logger/logger';

@singleton()
export class TransactionService {
  private readonly minimumAccountBalanceAfterTransactionInLowerUnit = 10000;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly transactionCrudService: TransactionCrudService,
    private readonly accountService: AccountService,
    private readonly transactionQueue: TransactionQueue,
    private readonly accountQueue: AccountQueue,
    private readonly externalTransactionService: ExternalTransactionService,
    private readonly logger: Logger
  ) {}

  async checkTransactionLimit(
    senderAccountId: string,
    amount: number,
    approvedKycLevel: KycLevel
  ) {
    if (approvedKycLevel === KycLevel.LEVEL_3) return;
    const dailyLimit = transactionLimit[approvedKycLevel];
    const amountInLowerUnit = amount * 100;

    const dailyTotal =
      await this.transactionCrudService.calculateDailyTotalSuccessTransfer(
        senderAccountId
      );

    if (dailyTotal + amountInLowerUnit >= dailyLimit) {
      throw new AppError(
        'Daily transaction limit reached. Upgrade your KYC level to increase your limit',
        HttpStatus.BAD_REQUEST
      );
    }
    return;
  }

  async validateInternalTransferDetail(
    senderAccountId: string,
    receiverAccountNumber: string,
    userId: string,
    amount: number
  ) {
    const amountInLowerUnit = await this.validateSenderAccountandAmount(
      amount,
      senderAccountId,
      userId
    );

    const findReceiverAccountOptions: FindOneOptions<Account> = {
      where: { accountNumber: receiverAccountNumber },
      relations: ['user'],
      select: {
        id: true,
        user: { firstName: true, lastName: true },
        accountNumber: true
      }
    };

    const receiverAccount = await this.accountService.findOne(findReceiverAccountOptions);

    if (!receiverAccount)
      throw new AppError('Invalid receiver account', HttpStatus.NOT_FOUND);

    return {
      receiverAccountId: receiverAccount.id,
      amountInLowerUnit,
      receiverName: `${receiverAccount.user.firstName} ${receiverAccount.user.lastName}`
    };
  }

  async validateSenderAccountandAmount(
    amount: number,
    senderAccountId: string,
    userId: string
  ) {
    const amountInLowerUnit = Number(amount) * 100;
    const requiredAvailableFunds =
      amountInLowerUnit + this.minimumAccountBalanceAfterTransactionInLowerUnit;

    const findSenderAccountOptions: FindOneOptions<Account> = {
      where: { id: senderAccountId, userId }
    };
    const senderAccount = await this.accountService.findOne(findSenderAccountOptions);

    if (!senderAccount) {
      this.logger.appLogger.warn(
        `Account not found: ID ${senderAccountId}, User ID ${userId}. Reason: Invalid account.`
      );
      throw new AppError('Invalid account', HttpStatus.NOT_FOUND);
    }

    if (senderAccount.status === AccountStatus.SUSPENDED) {
      this.logger.appLogger.warn(
        `Account with ID: ${senderAccountId} is suspended. User ID: ${userId}. Reason: Suspended account.`
      );
      throw new AppError(
        'Your account has been suspended. Please contact Customer Service for assistance.',
        HttpStatus.FORBIDDEN
      );
    }

    if (senderAccount.status === AccountStatus.LOCKED) {
      this.logger.appLogger.warn(
        `Account locked: ID ${senderAccountId}, User ID ${userId}. Expected unlock time: 23 hours.`
      );
      throw new AppError(
        'Your account is currently locked and will be unlocked in approximately 23 hour(s)',
        HttpStatus.LOCKED
      );
    }
    if (requiredAvailableFunds > senderAccount.balance) {
      this.logger.appLogger.warn(
        `Insufficient balance: Account ID ${senderAccountId}, User ID ${userId}. Amount: ${amountInLowerUnit}.`
      );
      throw new AppError('Insufficient balance', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    return amountInLowerUnit;
  }

  async initializeInternalTransfer(transactionJobType: TransactionJobType, data: any) {
    const reference = this.generateReferenceId();
    const transferData = { ...data, reference };
    return this.addTransactionQueue(transactionJobType, transferData);
  }

  async verifyExternalAccountBeforeTransfer(accountNumber: string, bankCode: string) {
    return this.paymentService.verifyAccountDetailBeforeTransfer(accountNumber, bankCode);
  }

  async initiateExternalTransfer(
    senderAccountId: string,
    customerName: string,
    accountNumber: string,
    bankCode: string,
    amount: number,
    remark?: string
  ) {
    const externalAccountRecipient = await this.accountService.findOneExternalAccount({
      where: { bankCode, accountNumber }
    });

    let { recipientCode, bankName, accountName } = externalAccountRecipient || {};

    if (!externalAccountRecipient) {
      const recipient = await this.paymentService.createExternalTransferRecipient(
        customerName,
        accountNumber,
        bankCode
      );

      const {
        active,
        details: { account_number, account_name, bank_code, bank_name },
        recipient_code
      } = recipient.data.data;

      if (!active) throw new AppError('Invalid account number', HttpStatus.BAD_REQUEST);

      this.accountQueue.addJob(AccountJobType.EXTERNAL_ACCOUNT_CREATION, {
        accountName: account_name,
        accountNumber: account_number,
        recipientCode: recipient_code,
        bankCode: bank_code,
        bankName: bank_name
      } as Partial<ExternalRecipient>);

      recipientCode = recipient_code;
      bankName = bank_name;
      accountName = account_name;
    }

    const reference = this.generateReferenceId();

    await this.externalTransactionService.debitAccountForExternalTransfer(
      senderAccountId,
      amount,
      bankName as string,
      accountName as string,
      accountNumber,
      reference,
      remark as string
    );

    // Works but needs a registered business Paystack account
    // return this.paymentService.initiateExternalTransfer(
    //   amount,
    //   recipientCode as string,
    //   reference,
    //   remark
    // );
    return 'Transaction successful'; // returned for now, will bw removed once Paystack account is resolved
  }

  async initiateDeposit(
    provider: PaymentProvider,
    transactionDetails: {
      email: string;
      amount: number;
      userId: string;
      receiverAccountId: string;
    }
  ) {
    const { email, amount, userId, receiverAccountId } = transactionDetails;
    const options: FindOneOptions = {
      where: { id: receiverAccountId }
    };

    const account = await this.accountService.findOne(options);

    if (!account || account.userId !== userId)
      throw new AppError('Invalid account id', HttpStatus.BAD_REQUEST);

    const amountInLowerunit = Number(amount) * 100;
    const reference = this.generateReferenceId();

    const paymentResponse = await this.paymentService.initializeTransaction(provider, {
      email,
      amount: amountInLowerunit,
      reference
    });

    if (!paymentResponse) {
      this.logger.appLogger.error(
        `Payment initialization failed: Email: ${email}, Amount: ${amountInLowerunit}, Reference: ${reference}, Provider: ${provider}.`
      );
      throw new AppError('Temporarily out of service', HttpStatus.BAD_GATEWAY);
    }

    const newTransactionRecord = this.createNewTransactionRecord(
      receiverAccountId,
      reference,
      amountInLowerunit,
      paymentResponse?.data.access_code,
      'Deposit via Paystack'
    );

    await this.transactionCrudService.create(newTransactionRecord);
    return paymentResponse.data;
  }

  addTransactionQueue(transactionJobType: TransactionJobType, data: any) {
    return this.transactionQueue.addJob(transactionJobType, data);
  }

  private generateReferenceId() {
    return uuidv4();
  }

  private createNewTransactionRecord(
    accoundId: string,
    reference: string,
    amount: number,
    accessCode: string,
    remark: string
  ): Partial<Transaction> {
    return {
      receiverAccountId: accoundId,
      externalSenderDetails: {
        name: 'Paystack',
        bank: 'Paystack'
      },
      reference,
      amount,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      origin: TransactionOrigin.EXTERNAL,
      accessCode,
      gateway: TransactionGateway.PAYSTACK,
      remark
    };
  }

  async getAccountTransactions(
    userId: string,
    accountId: string,
    paginationParams: PaginationParams
  ) {
    const account = await this.accountService.findOne({
      where: { id: accountId, userId }
    });
    if (!account) throw new AppError('Invalid account', HttpStatus.NOT_FOUND);

    return this.transactionCrudService.getOneAccountTransactions(
      accountId,
      paginationParams
    );
  }

  async getAccountTransaction(userId: string, accountId: string, reference: string) {
    const account = await this.accountService.findOne({
      where: { id: accountId, userId }
    });

    if (!account) throw new AppError('Invalid account', HttpStatus.NOT_FOUND);

    const transaction = await this.transactionCrudService.findOneTransaction(
      accountId,
      reference
    );
    if (!transaction) throw new AppError('Transaction not found', HttpStatus.NOT_FOUND);
    return transaction;
  }

  async getTransactions(
    userRole: Role,
    paginationParams: PaginationParams,
    parsedFilter?: Record<string, string>
  ) {
    return this.transactionCrudService.getTransactions(
      userRole,
      paginationParams,
      parsedFilter
    );
  }
}
