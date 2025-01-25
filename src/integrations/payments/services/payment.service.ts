import { inject, singleton } from 'tsyringe';
import { IPaystackPaymentProvider } from '../interfaces/paystack-payment.interface';
import { PaymentProvider } from '../enum/payment.enum';
import { AppError } from '../../../utils/app-error.utils';
import { HttpStatus } from '../../../common/http-codes/codes';
import { Transaction } from '../../../account/entities/transaction.entity';
import { FindOneOptions } from 'typeorm';
import {
  TransactionDepositData,
  TransactionStatus
} from '../../../account/enum/transaction.enum';
import { TransactionCrudService } from '../../../account/services/transaction/transaction-crud.service';

@singleton()
export class PaymentService {
  constructor(
    @inject('Paystack') private readonly paystackService: IPaystackPaymentProvider,
    private readonly transactionCrudService: TransactionCrudService
  ) {}

  async verifyAccountDetailBeforeTransfer(accountNumber: string, bankCode: string) {
    return this.paystackService.verifyAccountDetailBeforeExternalTransfer(
      accountNumber,
      bankCode
    );
  }

  async createExternalTransferRecipient(
    customerName: string,
    accountNumber: string,
    bankCode: string
  ) {
    return this.paystackService.createExternalTransferRecipient(
      customerName,
      accountNumber,
      bankCode
    );
  }

  async initiateExternalTransfer(
    amount: number,
    recipient: string,
    reference: string,
    reason?: string
  ) {
    return this.paystackService.initiateExternalTransfer(
      amount,
      recipient,
      reference,
      reason
    );
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

  async handleDeposit(transactionData: TransactionDepositData) {
    const { status, amount, reference } = transactionData;
    if (status && amount && reference) {
      const options: FindOneOptions<Transaction> = {
        where: { reference, status: TransactionStatus.PENDING }
      };

      const transactionRecord = await this.transactionCrudService.findOne(options);

      if (!transactionRecord) {
        console.error('Transaction not found:', reference);
        return { error: 'Transaction not found', code: HttpStatus.NOT_FOUND };
      }

      if (+transactionRecord.amount !== amount) {
        await this.transactionCrudService.handleDeposit(
          reference,
          transactionRecord.receiverAccountId,
          +transactionRecord.amount,
          TransactionStatus.FAILED,
          'Amount Mismatch'
        );
        console.error('Amount Mismatch', reference);
        return { error: 'Amount Mismatch', code: HttpStatus.BAD_REQUEST };
      }

      const transactionStatus =
        status === 'success' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;

      await this.transactionCrudService.handleDeposit(
        reference,
        transactionRecord.receiverAccountId,
        +transactionRecord.amount,
        transactionStatus,
        transactionStatus === TransactionStatus.FAILED ? status : undefined
      );

      return 'Verified';
    }
  }
}
