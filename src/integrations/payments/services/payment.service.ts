import { inject, singleton } from 'tsyringe';
import { IPaystackPaymentProvider } from '../interfaces/paystack-payment.interface';
import { PaymentProvider } from '../enum/payment.enum';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../../common/http-codes/codes';
import { Transaction } from '../../../account/entities/transaction.entity';
import { FindOneOptions } from 'typeorm';
import { TransactionDepositData, TransactionStatus } from '../../../account/enum/transaction.enum';
import { TransactionCrudService } from '../../../account/services/transaction/transaction-crud.service';
import { Logger } from '../../../common/logger/logger';

@singleton()
export class PaymentService {
  constructor(
    @inject('Paystack') private readonly paystackService: IPaystackPaymentProvider,
    private readonly transactionCrudService: TransactionCrudService,
    private readonly logger: Logger
  ) {}

  async verifyAccountNumber(accountNumber: string, bankCode: string) {
    return this.paystackService.verifyAccountNumber(accountNumber, bankCode);
  }

  async createExternalTransferRecipient(customerName: string, accountNumber: string, bankCode: string) {
    return this.paystackService.createExternalTransferRecipient(customerName, accountNumber, bankCode);
  }

  async initiateExternalTransfer(amount: number, recipient: string, reference: string, reason?: string) {
    return this.paystackService.initiateExternalTransfer(amount, recipient, reference, reason);
  }

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


}
