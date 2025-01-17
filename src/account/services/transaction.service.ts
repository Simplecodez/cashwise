import { singleton } from 'tsyringe';
import { PaymentService } from '../../integrations/payments/services/payment.service';
import { PaymentProvider } from '../../integrations/payments/enum/payment.enum';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from '../entities/transaction.entity';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../../common/http-codes/codes';
import { TransactionCrudService } from './transaction-crud.service';
import {
  TransactionGateway,
  TransactionJobType,
  TransactionOrigin,
  TransactionStatus,
  TransactionType
} from '../enum/transaction.enum';
import { AccountService } from './account.service';
import { FindOneOptions } from 'typeorm';
import { TransactionQueue } from '../job-processor/transaction.queue';

@singleton()
export class TransactionService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly transactionCrudService: TransactionCrudService,
    private readonly accountService: AccountService,
    private readonly transactionQueue: TransactionQueue
  ) {}

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

    const amountInLowerunit = +amount * 100;
    const reference = this.generateReferenceId();

    const paymentResponse = await this.paymentService.initializeTransaction(provider, {
      email,
      amount: amountInLowerunit,
      reference
    });

    if (!paymentResponse)
      throw new AppError('Temporarily out of service', HttpStatus.BAD_GATEWAY);

    const newTransactionRecord = this.createNewTransactionRecord(
      receiverAccountId,
      reference,
      amountInLowerunit,
      paymentResponse?.data.access_code,
      'Deposit via Paystack'
    );

    await this.transactionCrudService.create(newTransactionRecord);
    return paymentResponse.data;
  }

  addTransactionQueue(transactionJobType: TransactionJobType, data: any) {
    return this.transactionQueue.addJob(transactionJobType, data);
  }

  private generateReferenceId() {
    return uuidv4();
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
