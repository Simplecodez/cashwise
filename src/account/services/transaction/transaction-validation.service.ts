import { singleton } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import {
  ReceiverData,
  TransactionFlag,
  TransactionJobType,
  transactionLimit,
  TransactionStatus
} from '../../enum/transaction.enum';
import { KycLevel } from '../../../user/enum/kyc.enum';
import { TransactionCrudService } from './transaction-crud.service';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../../common/http-codes/codes';
import { RedisCache } from '../../../configs/redis/redis.service';
import { AccountService } from '../account/account.service';
import { PaymentService } from '../../../integrations/payments/services/payment.service';

@singleton()
export class TransactionValidationService {
  private readonly TRANSACTION_FLAG_THRESHOLD = 0.4;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly transactionCrudService: TransactionCrudService,
    private readonly accountService: AccountService,
    private readonly cacheService: RedisCache
  ) {}

  async validateInternalTransferDetails(
    senderAccountId: string,
    receiverAccountNumber: string,
    userId: string,
    approvedKycLevel: KycLevel,
    transactionJobType: TransactionJobType,
    amount: number,
    remark?: string
  ) {
    await this.accountService.validateSenderAccount(userId, senderAccountId, amount);
    const receiverDetails = await this.accountService.validateReceiverAccount(receiverAccountNumber);

    return this.prepareTransactionForProcessing(
      userId,
      senderAccountId,
      receiverDetails,
      amount,
      approvedKycLevel,
      transactionJobType,
      remark
    );
  }

  async validateExternalTransferDetails(
    userId: string,
    approvedKycLevel: KycLevel,
    senderAccountId: string,
    receiverAccountNumber: string,
    amount: number,
    bankCode: string,
    remark?: string
  ) {
    const amountInLowerUnit = await this.accountService.validateSenderAccount(
      userId,
      senderAccountId,
      amount
    );

    const verificationResult = await this.paymentService.verifyAccountNumber(receiverAccountNumber, bankCode);

    const receiverDetails = {
      receiverName: verificationResult.data.data.account_name,
      accountNumber: receiverAccountNumber,
      bankCode
    };

    return this.prepareTransactionForProcessing(
      userId,
      senderAccountId,
      receiverDetails,
      amount,
      approvedKycLevel,
      TransactionJobType.EXTERNAL_TRANSFER_PAYSTACK,
      remark
    );
  }

  async validateExternalAccount(accountNumber: string, bankCode: string) {
    return this.paymentService.verifyAccountNumber(accountNumber, bankCode);
  }

  private async validateDailyTransactionLimit(
    approvedKycLevel: KycLevel,
    senderAccountId: string,
    amountInLowerUnit: number,
    dailyLimit: number
  ) {
    if (approvedKycLevel !== KycLevel.LEVEL_3) {
      const dailyTotal = await this.transactionCrudService.calculateDailyTotalSuccessTransfer(
        senderAccountId
      );

      if (dailyTotal + amountInLowerUnit >= dailyLimit) {
        throw new AppError(
          'Daily transaction limit reached. Upgrade your KYC level to increase your limit',
          HttpStatus.BAD_REQUEST
        );
      }
    }
  }

  private async prepareTransactionForProcessing(
    senderId: string,
    senderAccountId: string,
    receiverDetails: ReceiverData,
    amount: number,
    approvedKycLevel: KycLevel,
    transactionJobType: TransactionJobType,
    remark?: string
  ) {
    const dailyLimit = transactionLimit[approvedKycLevel];
    const amountInLowerUnit = Number(amount) * 100;

    await this.validateDailyTransactionLimit(
      approvedKycLevel,
      senderAccountId,
      amountInLowerUnit,
      dailyLimit
    );

    let cacheKey = `txn-${uuidv4().replace(/-/g, '')}`;
    let authMethod = 'PIN';
    let transactionFlag = TransactionFlag.NORMAL;

    if (amountInLowerUnit >= dailyLimit * this.TRANSACTION_FLAG_THRESHOLD) {
      authMethod = 'PASSPHRASE';
      transactionFlag = TransactionFlag.LARGE_AMOUNT;
    }

    await this.cacheService.set(
      cacheKey,
      {
        senderId,
        senderAccountId,
        receiverDetails,
        amountInLowerUnit,
        transactionJobType,
        transactionFlag,
        transactionStatus: TransactionStatus.PENDING,
        remark
      },
      300
    );

    return {
      status: 'pending_auth',
      message: 'Further authentication required.',
      authMethod,
      auth_key: cacheKey
    };
  }
}
