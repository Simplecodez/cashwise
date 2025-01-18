import { singleton } from 'tsyringe';
import { Job } from 'bullmq';
import { TransactionJobType } from '../enum/transaction.enum';
import { PaymentService } from '../../integrations/payments/services/payment.service';
import { InternalTransactionService } from '../services/transaction/internal-transaction.service';
import { AppError } from '../../utils/app-error.utils';

@singleton()
export class TransactionProcessor {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly internalTransactionService: InternalTransactionService
  ) {}

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case TransactionJobType.DEPOSIT_PAYSTACK: {
        try {
          await this.paymentService.handleDeposit(job.data);
        } catch (error) {
          throw error;
        }

        break;
      }

      case TransactionJobType.INTERNAL_TRANSFER: {
        try {
          await this.internalTransactionService.processInternalTransfer(job.data);
          //notify after successful transfer
        } catch (error: AppError | any) {
          switch (error?.message) {
            case 'Duplicate transaction': {
              // notify
              break;
            }

            default:
              throw error;
          }
        }
      }

      default:
        break;
    }
  }
}
