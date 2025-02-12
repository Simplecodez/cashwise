import { inject, singleton } from 'tsyringe';
import { AccountService } from '../account/account.service';
import { PaymentProvider } from '../../../integrations/payments/enum/payment.enum';
import { HttpStatus } from '../../../common/http-codes/codes';
import { AppError } from '../../../utils/app-error.utils';
import { v4 as uuidv4 } from 'uuid';
import { AccountQueue } from '../../job-processor/account.queue';
import { DataSource, FindOneOptions } from 'typeorm';
import { Transaction } from '../../entities/transaction.entity';
import {
  TransactionGateway,
  TransactionOrigin,
  TransactionStatus,
  TransactionType
} from '../../enum/transaction.enum';
import { PaymentService } from '../../../integrations/payments/services/payment.service';
import { Logger } from '../../../common/logger/logger';
import { TransactionCrudService } from './transaction-crud.service';

@singleton()
export class TransactionInitService {
  constructor(
    private readonly accountService: AccountService,
    private readonly paymentService: PaymentService,
    private readonly transactionCrudService: TransactionCrudService,
    private readonly logger: Logger
  ) {}

  private generateReferenceId() {
    return uuidv4();
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
        `Payment initialization failed: Reference: ${reference}, Provider: ${provider}, Timestamp: ${new Date().toISOString()}.`
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

    this.logger.appLogger.info(
      `Payment initialization successful: Ref: ${reference}, Provider: ${provider} Timestamp: ${new Date().toISOString()}.`
    );
    return paymentResponse.data;
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
}
