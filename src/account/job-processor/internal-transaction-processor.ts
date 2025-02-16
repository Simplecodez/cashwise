import { singleton } from 'tsyringe';
import { BeneficiaryQueue } from './beneficiary.queue';
import { BeneficiaryJob } from '../enum/beneficiary.enum';
import { Beneficiary } from '../entities/beneficiary.entity';
import { TransactionInternalFundTransferService } from '../services/transaction/transaction-internal-fund-transfer.service';
import { BeneficiaryService } from '../services/account/beneficiary.service';

@singleton()
export class InternalTransactionProcessorService {
  constructor(
    private readonly transactionInternalFundTransferService: TransactionInternalFundTransferService,
    private readonly beneficiaryQueue: BeneficiaryQueue,
    private readonly beneficiaryService: BeneficiaryService
  ) {}

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

    const transferResult = await this.transactionInternalFundTransferService.transferFunds({
      senderAccountId,
      amount,
      receiverAccountId,
      reference,
      remark
    });

    const existingBeneficiary = await this.beneficiaryService.findOne(
      senderAccountId,
      receiverAccountNumber
    );
    if (!existingBeneficiary) {
      const beneficiary: Partial<Beneficiary> = {
        userId,
        accountId: senderAccountId,
        beneficiaryAccountNumber: receiverAccountNumber,
        beneficiaryName: receiverName
      };
      this.beneficiaryQueue.addJob(BeneficiaryJob.CREATION, beneficiary);
    }

    return transferResult;
  }
}
