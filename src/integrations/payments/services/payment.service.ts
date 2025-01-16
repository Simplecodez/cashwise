import { inject, singleton } from 'tsyringe';
import { IPaymentProvider } from '../interfaces/payment.interface';
import { PaymentProvider } from '../enum/payment.enum';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../../common/http-codes/codes';

@singleton()
export class PaymentService {
  constructor(@inject('Paystack') private readonly paystackService: IPaymentProvider) {}

  async initializeTransaction(
    provider: PaymentProvider,
    transactionDetails: {
      email: string;
      amount: number;
      reference: string;
    }
  ) {
    const { email, amount, reference } = transactionDetails;

    if (provider === PaymentProvider.PAYSTACK)
      return this.paystackService.initializeTransaction(email, amount, reference);

    if (provider === PaymentProvider.STRIPE) return;

    throw new AppError('Invalid payment gateway', HttpStatus.BAD_REQUEST);
  }

  async verifyTransaction(reference: string) {
    return this.paystackService.verifyTransaction(reference);
  }
}
