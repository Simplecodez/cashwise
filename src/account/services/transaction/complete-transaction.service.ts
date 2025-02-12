import { singleton } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { RedisCache } from '../../../configs/redis/redis.service';
import {
  TransactionFlag,
  TransactionJobType,
  TransactionStatus,
  TransferData
} from '../../enum/transaction.enum';
import { Logger } from '../../../common/logger/logger';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../../common/http-codes/codes';
import { AccountService } from '../account/account.service';
import { CommonUtils } from '../../../utils/common.utils';
import { TransactionQueue } from '../../job-processor/transaction.queue';

@singleton()
export class CompleteTransactionService {
  constructor(
    private readonly cacheService: RedisCache,
    private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly transactionQueue: TransactionQueue
  ) {}

  async completeTransfer(transactionKey: string, passcodeOrPassphrase: string) {
    const transferData: TransferData = await this.cacheService.get(transactionKey);
    let isVerified = false;

    if (!transferData) {
      this.logger.appLogger.debug(`Invalid transaction key: Timestamp: ${new Date().toISOString()}`);
      throw new AppError('Invalid transaction key', HttpStatus.BAD_REQUEST);
    }

    if (transferData.transactionStatus === TransactionStatus.SUCCESS) {
      this.logger.appLogger.debug(`Duplicate transaction: Timestamp: ${new Date().toISOString()}`);
      throw new AppError('Duplicate transaction, please try again later', HttpStatus.BAD_REQUEST);
    }

    const account = await this.accountService.findOne({
      where: { id: transferData.senderAccountId },
      select: ['passPhrase', 'passcode']
    });

    if (transferData.transactionFlag === TransactionFlag.NORMAL) {
      isVerified = await CommonUtils.verifyPassword(passcodeOrPassphrase, account?.passcode as string);
    } else if (transferData.transactionFlag === TransactionFlag.LARGE_AMOUNT) {
      isVerified = await CommonUtils.verifyPassword(passcodeOrPassphrase, account?.passPhrase as string);
    }

    if (!isVerified) throw new AppError('Incorrect pin or passphrase', HttpStatus.UNAUTHORIZED);

    if (transferData.transactionJobType === TransactionJobType.INTERNAL_TRANSFER)
      this.addTransactionToQueue(TransactionJobType.INTERNAL_TRANSFER, {
        userId: transferData.senderId,
        senderAccountId: transferData.senderAccountId,
        receiverAccountNumber: transferData.receiverDetails.accountNumber,
        receiverAccountId: transferData.receiverDetails.accountId,
        amount: transferData.amountInLowerUnit,
        receiverName: transferData.receiverDetails.receiverName
      });

    if (transferData.transactionJobType === TransactionJobType.EXTERNAL_TRANSFER_PAYSTACK)
      this.addTransactionToQueue(TransactionJobType.EXTERNAL_TRANSFER_PAYSTACK, {
        senderAccountId: transferData.senderAccountId,
        receiverName: transferData.receiverDetails.receiverName,
        receiverAccountNumber: transferData.receiverDetails.accountNumber,
        bankCode: transferData.receiverDetails.bankCode as string,
        amount: transferData.amountInLowerUnit,
        remark: transferData.remark
      });

    const formattedCurrency = CommonUtils.formatCurrency(transferData.amountInLowerUnit);

    await this.cacheService.set(
      transactionKey,
      {
        ...transferData,
        transactionStatus: TransactionStatus.SUCCESS
      },
      30
    );

    return `Success! ${formattedCurrency} is on its way to ${transferData.receiverDetails.receiverName}-(${transferData.receiverDetails.accountNumber})`;
  }

  private async addTransactionToQueue(transactionJobType: TransactionJobType, data: any) {
    const reference = this.generateReferenceId();
    const transferData = { ...data, reference };
    return this.transactionQueue.addJob(transactionJobType, transferData);
  }

  private generateReferenceId() {
    return uuidv4();
  }
}
