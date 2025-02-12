import { singleton } from 'tsyringe';
import { FindOneOptions } from 'typeorm';
import { HttpStatus } from '../../common/http-codes/codes';
import { AppError } from '../../utils/app-error.utils';
import { TransactionCrudService } from '../services/transaction/transaction-crud.service';
import { Transaction } from '../entities/transaction.entity';
import { BeneficiaryQueue } from './beneficiary.queue';
import { BeneficiaryJob } from '../enum/beneficiary.enum';
import { Beneficiary } from '../entities/beneficiary.entity';
import { BeneficiaryService } from '../services/beneficiary.service';

@singleton()
export class InternalTransactionProcessorService {
  constructor(
    private readonly transactionCrudService: TransactionCrudService,
    private readonly beneficiaryQueue: BeneficiaryQueue,
    private readonly beneficiaryService: BeneficiaryService
  ) {}

  async validateTransaction(reference: string) {
    const findTransactionOptions: FindOneOptions<Transaction> = {
      where: { reference }
    };
    const transactionRecord = await this.transactionCrudService.findOne(findTransactionOptions);
    if (transactionRecord) throw new AppError('Duplicate transaction', HttpStatus.BAD_REQUEST);
  }

  async processInternalTransfer(transferData: {
    userId: string;
    senderAccountId: string;
    receiverAccountId: string;
    receiverAccountNumber: string;
    receiverName: string;
    amount: number;
    reference: string;
    remark?: string;
  }) {
    const {
      senderAccountId,
      receiverAccountId,
      amount,
      reference,
      remark,
      receiverAccountNumber,
      receiverName,
      userId
    } = transferData;

    await this.validateTransaction(reference);

    await this.transactionCrudService.handleInternalTransfer({
      senderAccountId,
      amount,
      receiverAccountId,
      reference,
      remark
    });

    const existingBeneficiary = await this.beneficiaryService.findOne(senderAccountId, receiverAccountNumber);
    if (!existingBeneficiary) {
      const beneficiary: Partial<Beneficiary> = {
        userId,
        accountId: senderAccountId,
        beneficiaryAccountNumber: receiverAccountNumber,
        beneficiaryName: receiverName
      };
      this.beneficiaryQueue.addJob(BeneficiaryJob.CREATION, beneficiary);
    }

    return 'Transfer successful';
  }
}
