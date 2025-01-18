import { singleton } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { TransactionCrudService } from './transaction-crud.service';
import { FindOneOptions } from 'typeorm';
import { PaymentService } from '../../../integrations/payments/services/payment.service';
import { AccountService } from '../account.service';
import { TransactionQueue } from '../../job-processor/transaction.queue';
import { PaymentProvider } from '../../../integrations/payments/enum/payment.enum';
import { HttpStatus } from '../../../common/http-codes/codes';
import { AppError } from '../../../utils/app-error.utils';
import {
  TransactionGateway,
  TransactionJobType,
  TransactionOrigin,
  TransactionStatus,
  TransactionType
} from '../../enum/transaction.enum';
import { Transaction } from '../../entities/transaction.entity';
import { Account } from '../../entities/account.entity';
import { KycLevel } from '../../../user/enum/kyc.enum';

@singleton()
export class TransactionService {
  private readonly minimumAccountBalanceAfterTransactionInLowerUnit = 10000;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly transactionCrudService: TransactionCrudService,
    private readonly accountService: AccountService,
    private readonly transactionQueue: TransactionQueue
  ) {}

  async validateInternalTransferDetail(
    senderAccountId: string,
    receiverAccountNumber: string,
    userId: string,
    amount: number,
    approvedKycLevel: KycLevel
  ) {
    const amountInLowerUnit = Number(amount) * 100;
    const requiredAvailableFunds =
      amountInLowerUnit + this.minimumAccountBalanceAfterTransactionInLowerUnit;

    const findSenderAccountOptions: FindOneOptions<Account> = {
      where: { id: senderAccountId, userId }
    };
    const senderAccount = await this.accountService.findOne(findSenderAccountOptions);

    if (!senderAccount) throw new AppError('Invalid account', HttpStatus.NOT_FOUND);

    if (requiredAvailableFunds > senderAccount.balance)
      throw new AppError('Insufficient balance', HttpStatus.UNPROCESSABLE_ENTITY);

    const findReceiverAccountOptions: FindOneOptions<Account> = {
      where: { accountNumber: receiverAccountNumber }
    };

    const receiverAccount = await this.accountService.findOne(findReceiverAccountOptions);
    if (!receiverAccount)
      throw new AppError('Invalid receiver account', HttpStatus.NOT_FOUND);

    return { receiverAccountId: receiverAccount.id, amountInLowerUnit };
  }

  initializeInternalTransfer(transactionJobType: TransactionJobType, data: any) {
    const reference = this.generateReferenceId();
    const transferData = { ...data, reference };
    return this.addTransactionQueue(transactionJobType, transferData);
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
