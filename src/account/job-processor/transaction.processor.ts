import { singleton } from 'tsyringe';
import { Job } from 'bullmq';
import { TransactionJobType } from '../enum/transaction.enum';
import { PaymentService } from '../../integrations/payments/services/payment.service';
import { InternalTransactionProcessorService } from './internal-transaction-processor';
import { AppError } from '../../utils/app-error.utils';
import { ExternalTransactionProcessorService } from './external-transaction-processor';
import { Logger } from '../../common/logger/logger';

@singleton()
export class TransactionProcessor {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly internalTransactionProcessorService: InternalTransactionProcessorService,
    private readonly externalTransactionProcessorService: ExternalTransactionProcessorService,
    private readonly logger: Logger
  ) {}

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case TransactionJobType.DEPOSIT_PAYSTACK: {
        try {
          await this.externalTransactionProcessorService.processDeposit(job.data);
        } catch (error: any) {
          this.logger.appLogger.error(error.message, error.stack);
          throw error;
        }

        break;
      }

      case TransactionJobType.INTERNAL_TRANSFER: {
        try {
          await this.internalTransactionProcessorService.processInternalTransfer(job.data);
          //notify after successful transfer
        } catch (error: AppError | any) {
          this.logger.appLogger.error(error.message, error.stack);
          switch (error?.message) {
            case 'Duplicate transaction': {
              // notify
              break;
            }

            default:
              throw error;
          }
        }
        break;
      }

      case TransactionJobType.EXTERNAL_TRANSFER_PAYSTACK: {
        try {
          await this.externalTransactionProcessorService.processExternalTransfer(job.data);
        } catch (error: any) {
          this.logger.appLogger.error(error.message, error.stack);
        }
        break;
      }

      default:
        break;
    }
  }
}
