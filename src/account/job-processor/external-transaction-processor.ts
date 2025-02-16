import { inject, singleton } from 'tsyringe';
import { TransactionDepositData, TransactionStatus } from '../enum/transaction.enum';
import { TransactionDepositService } from '../services/transaction/transaction-deposit.service';
import { TransactionExternalFundTransfer } from '../services/transaction/transaction-external-fund-transfer.service';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';

@singleton()
export class ExternalTransactionProcessorService {
  constructor(
    @inject('TransactionRepository')
    private readonly transactionRepository: Repository<Transaction>,
    private readonly transactionDepositService: TransactionDepositService,
    private readonly transactionExternalFundTransfer: TransactionExternalFundTransfer
  ) {}

  async processDeposit(transactionData: TransactionDepositData) {
    return this.transactionDepositService.processDeposit(transactionData);
  }

  async processTransfer(transferData: {
    status: string;
    reference: string;
    amount: number;
    session: {};
  }) {
    const { status, reference, amount, session } = transferData;
    const transactionStatus =
      status === 'success'
        ? TransactionStatus.SUCCESS
        : status === 'reversed'
        ? TransactionStatus.REVERSED
        : TransactionStatus.FAILED;

    const transactionRecord = await this.transactionRepository.findOne({
      where: { reference }
    });
    if (!transactionRecord) return { error: 'Transaction not found' };

    const { senderAccountId } = transactionRecord;

    return this.transactionExternalFundTransfer.updateExternalTransferTransactionStatus(
      senderAccountId,
      transactionStatus,
      amount,
      reference,
      session
    );
  }
}
