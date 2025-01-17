import { singleton } from 'tsyringe';
import { Job } from 'bullmq';
import { TransactionJobType } from '../enum/transaction.enum';
import { PaymentService } from '../../integrations/payments/services/payment.service';

@singleton()
export class TransactionProcessor {
  constructor(private readonly paymentService: PaymentService) {}

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

      default:
        break;
    }
  }
}
