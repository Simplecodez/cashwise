import { singleton } from 'tsyringe';
import { TransactionQueue } from '../../job-processor/transaction.queue';
import { PaymentProvider } from '../../../integrations/payments/enum/payment.enum';
import { TransactionJobType } from '../../enum/transaction.enum';
import { KycLevel } from '../../../user/enum/kyc.enum';
import { PaginationParams } from '../../../common/pagination/pagination/pagination.args';
import { Role } from '../../../user/enum/user.enum';
import { TransactionValidationService } from './transaction-validation.service';
import { TransactionInitService } from './transaction-init-deposit.service';
import { TransactionRetrievalService } from './transaction-retrieval.service';
import { CompleteTransactionService } from './transaction-completion.service';
import { TransactionExternalFundTransfer } from './transaction-external-fund-transfer.service';

@singleton()
export class TransactionService {
  constructor(
    private readonly transactionValidationService: TransactionValidationService,
    private readonly transactionInitService: TransactionInitService,
    private readonly transactionQueue: TransactionQueue,
    private readonly transactionRetrievalService: TransactionRetrievalService,
    private readonly transactionExternalFundTransfer: TransactionExternalFundTransfer,
    private readonly completeTransactionService: CompleteTransactionService
  ) {}

  async validateInternalTransferDetails(
    senderAccountId: string,
    receiverAccountNumber: string,
    userId: string,
    approvedKycLevel: KycLevel,
    transactionJobType: TransactionJobType,
    amount: number,
    remark?: string
  ) {
    return this.transactionValidationService.validateInternalTransferDetails(
      senderAccountId,
      receiverAccountNumber,
      userId,
      approvedKycLevel,
      transactionJobType,
      amount,
      remark
    );
  }

  async validateExternalTransferDetails(
    userId: string,
    approvedKycLevel: KycLevel,
    senderAccountId: string,
    receiverAccountNumber: string,
    amount: number,
    bankCode: string,
    remark?: string
  ) {
    return this.transactionValidationService.validateExternalTransferDetails(
      userId,
      approvedKycLevel,
      senderAccountId,
      receiverAccountNumber,
      amount,
      bankCode,
      remark
    );
  }

  async completeTransfer(userId: string, transactionKey: string, passcodeOrPassphrase: string) {
    return this.completeTransactionService.completeTransfer(
      userId,
      transactionKey,
      passcodeOrPassphrase
    );
  }

  async verifyExternalAccount(accountNumber: string, bankCode: string) {
    return this.transactionValidationService.validateExternalAccount(accountNumber, bankCode);
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
    return this.transactionInitService.initiateDeposit(provider, transactionDetails);
  }

  async addTransactionQueue(transactionJobType: TransactionJobType, data: any) {
    return this.transactionQueue.addJob(transactionJobType, data);
  }

  async getAccountTransactions(
    userId: string,
    accountId: string,
    paginationParams: PaginationParams
  ) {
    return this.transactionRetrievalService.getAccountTransactions(
      userId,
      accountId,
      paginationParams
    );
  }

  async getAccountTransaction(userId: string, accountId: string, reference: string) {
    return this.transactionRetrievalService.findOneTransaction(userId, accountId, reference);
  }

  async getTransactions(
    userRole: Role,
    paginationParams: PaginationParams,
    parsedFilter?: Record<string, string>
  ) {
    return this.transactionRetrievalService.getTransactions(
      userRole,
      paginationParams,
      parsedFilter
    );
  }
}
