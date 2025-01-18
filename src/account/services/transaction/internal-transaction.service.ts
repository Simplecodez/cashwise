import { singleton } from 'tsyringe';
import { AccountService } from '../account.service';
import { FindOneOptions } from 'typeorm';
import { Account } from '../../entities/account.entity';
import { HttpStatus } from '../../../common/http-codes/codes';
import { AppError } from '../../../utils/app-error.utils';
import { TransactionCrudService } from './transaction-crud.service';
import { Transaction } from '../../entities/transaction.entity';

@singleton()
export class InternalTransactionService {
  constructor(
    private readonly accountService: AccountService,
    private readonly transactionCrudService: TransactionCrudService
  ) {}

  async initializeInternalTransfer(reference: string) {
    const findTransactionOptions: FindOneOptions<Transaction> = {
      where: { reference }
    };
    const transactionRecord = await this.transactionCrudService.findOne(
      findTransactionOptions
    );
    if (transactionRecord)
      throw new AppError('Duplicate transaction', HttpStatus.BAD_REQUEST);
  }

  async processInternalTransfer(transferData: {
    userId: string;
    senderAccountId: string;
    receiverAccountId: string;
    amount: number;
    reference: string;
    remark?: string;
  }) {
    const { userId, senderAccountId, receiverAccountId, amount, reference, remark } =
      transferData;
    await this.initializeInternalTransfer(reference);

    await this.transactionCrudService.handleInternalTransfer({
      senderAccountId,
      amount,
      receiverAccountId,
      reference,
      remark
    });

    return 'Transfer successful';
  }
}
