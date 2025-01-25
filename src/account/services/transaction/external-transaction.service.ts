import { singleton } from 'tsyringe';
import { TransactionCrudService } from './transaction-crud.service';
import { Transaction } from '../../entities/transaction.entity';
import {
  TransactionGateway,
  TransactionOrigin,
  TransactionStatus,
  TransactionType
} from '../../enum/transaction.enum';
import { HttpStatus } from '../../../common/http-codes/codes';

@singleton()
export class ExternalTransactionService {
  constructor(private readonly transactionCrudService: TransactionCrudService) {}

  async debitAccountForExternalTransfer(
    senderAccountId: string,
    amount: number,
    bank: string,
    recipientName: string,
    accountNumber: string,
    reference: string,
    remark: string
  ) {
    const transactionRecord: Partial<Transaction> = {
      senderAccountId,
      externalReceiverDetails: {
        name: recipientName,
        bank,
        accountNumber
      },
      reference,
      amount,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.SUCCESS, // Will be changed to pending when a registered Paystack business account is available
      origin: TransactionOrigin.EXTERNAL,
      gateway: TransactionGateway.PAYSTACK,
      remark
    };
    return this.transactionCrudService.handleExternalTransferDebit(
      senderAccountId,
      amount,
      transactionRecord
    );
  }

  async processExternalTransfer(transferData: {
    status: string;
    reference: string;
    amount: number;
    session: {};
  }) {
    const { status, reference, amount, session } = transferData;
    const transactionRecord = await this.transactionCrudService.findOne({
      where: { reference }
    });
    if (!transactionRecord) return { error: 'Transaction not found' };

    const { senderAccountId } = transactionRecord;

    const transactionStatus =
      status === 'success'
        ? TransactionStatus.SUCCESS
        : status === 'reversed'
        ? TransactionStatus.REVERSED
        : TransactionStatus.FAILED;

    return this.transactionCrudService.updateExternalTransferTransactionStatus(
      senderAccountId,
      transactionStatus,
      amount,
      reference,
      session
    );
  }
}
