import { singleton } from 'tsyringe';
import { Job } from 'bullmq';
import { TransactionJobType } from '../enum/transaction.enum';
import { InternalTransactionProcessorService } from './internal-transaction-processor';
import { AppError } from '../../utils/app-error.utils';
import { ExternalTransactionProcessorService } from './external-transaction-processor';
import { Logger } from '../../common/logger/logger';
import { ActivityQueue } from '../../activity/job-processor/activity.queue';
import { ActivityJobType, ActivityType } from '../../activity/enum/activity.enum';
import { maskNumberString } from '../../utils/db.utils';
import { Account } from '../entities/account.entity';

@singleton()
export class TransactionProcessor {
  constructor(
    private readonly internalTransactionProcessorService: InternalTransactionProcessorService,
    private readonly externalTransactionProcessorService: ExternalTransactionProcessorService,
    private readonly activityQueue: ActivityQueue,
    private readonly logger: Logger
  ) {}

  private addActivityJob(result: { isSuspended: boolean; receiverAccount: Account | null }) {
    const maskedAccountNumber = maskNumberString(result.receiverAccount?.accountNumber as string);
    this.activityQueue.addJob(ActivityJobType.CREATE, {
      userId: result.receiverAccount?.userId,
      type: ActivityType.ACCOUNT_SUSPENSION,
      description: `Account - name: ${result.receiverAccount?.name}, account number: ${maskedAccountNumber} suspended for exceeding deposit limit.`
    });
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case TransactionJobType.DEPOSIT_PAYSTACK: {
        try {
          const depositResult = await this.externalTransactionProcessorService.processDeposit(
            job.data
          );
          if (depositResult?.isSuspended) {
            this.addActivityJob(depositResult);
          }
        } catch (error: any) {
          this.logger.appLogger.error(error.message, error.stack);
          if (error instanceof AppError) {
            return;
          }
          throw error;
        }

        break;
      }

      case TransactionJobType.INTERNAL_TRANSFER: {
        try {
          const transferResult =
            await this.internalTransactionProcessorService.processInternalTransfer(job.data);
          if (transferResult?.isSuspended) {
            this.addActivityJob(transferResult);
          }
          //notify after successful transfer
        } catch (error: AppError | any) {
          this.logger.appLogger.error(error.message, error.stack);
          if (error instanceof AppError) {
            return;
          }
          throw error;
        }

        break;
      }

      case TransactionJobType.EXTERNAL_TRANSFER_PAYSTACK: {
        try {
          await this.externalTransactionProcessorService.processTransfer(job.data);
        } catch (error: any) {
          this.logger.appLogger.error(error.message, error.stack);
          if (error instanceof AppError) {
            return;
          }
        }

        break;
      }

      default:
        break;
    }
  }
}
