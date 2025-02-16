import { inject, singleton } from "tsyringe";
import { v4 as uuidv4 } from "uuid";
import { Transaction } from "../../entities/transaction.entity";
import { DataSource, MoreThan } from "typeorm";
import { Account } from "../../entities/account.entity";
import { AppError } from "../../../utils/app-error.utils";
import { HttpStatus } from "../../../common/http-codes/codes";
import { AccountService } from "../account/account.service";
import { Logger } from "../../../common/logger/logger";
import { PaymentProvider } from "../../../integrations/payments/enum/payment.enum";
import { PaymentService } from "../../../integrations/payments/services/payment.service";
import { AccountJobType } from "../../enum/account.enum";
import { ExternalRecipient } from "../../entities/external-account.entity";
import {
  TransactionGateway,
  TransactionOrigin,
  TransactionStatus,
  TransactionType,
} from "../../enum/transaction.enum";
import { AccountQueue } from "../../job-processor/account.queue";

@singleton()
export class TransactionExternalFundTransfer {
  private readonly MINIMUM_ACCOUNT_BALANCE = 10000;

  constructor(
    @inject("DataSource") private readonly datasource: DataSource,
    private readonly accountService: AccountService,
    private readonly paymentService: PaymentService,
    private readonly accountQueue: AccountQueue,
    private readonly logger: Logger
  ) {}

  private async debitAccount(
    senderAccountId: string,
    amount: number,
    transactionRecord: Partial<Transaction>
  ) {
    return this.datasource.transaction(async (transactionalEntityManager) => {
      const requiredAvailableFunds = amount + this.MINIMUM_ACCOUNT_BALANCE;
      await transactionalEntityManager.findOne(Account, {
        where: { id: senderAccountId },
        select: ["id"],
        lock: { mode: "pessimistic_write" },
      });

      const receiverAccountDebitResult =
        await transactionalEntityManager.decrement(
          Account,
          { id: senderAccountId, balance: MoreThan(requiredAvailableFunds) },
          "balance",
          amount
        );

      if (receiverAccountDebitResult.affected === 0) {
        this.logAccountWarning(senderAccountId, "Insufficient Account Balance");
        throw new AppError(
          "Insufficient account balance",
          HttpStatus.BAD_REQUEST
        );
      }

      const newTransactionRecord = transactionalEntityManager.create(
        Transaction,
        transactionRecord
      );

      await transactionalEntityManager.insert(
        Transaction,
        newTransactionRecord
      );
    });
  }

  async intitiateTransfer(transferData: {
    senderAccountId: string;
    receiverName: string;
    accountNumber: string;
    bankCode: string;
    amount: number;
    remark?: string;
  }) {
    const {
      senderAccountId,
      receiverName,
      accountNumber,
      bankCode,
      amount,
      remark,
    } = transferData;
    const externalAccountRecipient =
      await this.accountService.findOneExternalAccount({
        where: { bankCode, accountNumber },
      });

    let { recipientCode, bankName, accountName } =
      externalAccountRecipient || {};

    if (!externalAccountRecipient) {
      const result = await this.handleExternalRecipientCreation(
        receiverName,
        accountNumber,
        bankCode
      );
      recipientCode = result.recipientCode;
      bankName = result.bankName;
      accountName = result.accountName;
    }

    const reference = this.generateReference();

    const transactionRecord = this.generateTransactionRecord(
      senderAccountId,
      amount,
      bankName as string,
      accountName as string,
      accountNumber,
      reference,
      remark
    );

    await this.debitAccount(senderAccountId, amount, transactionRecord);

    // Works but needs a registered business Paystack account
    // await this.paymentService.initiateExternalTransfer(
    //     amount,
    //     recipientCode as string,
    //     reference,
    //     remark
    //   );

    this.logger.appLogger.info(
      `Successful external transfer initialization: Provider: ${
        PaymentProvider.PAYSTACK
      }, Timestamp: ${new Date().toISOString()}`
    );

    return "Transaction successful"; // returned for now, will bw removed once Paystack account is resolved
  }

  private async handleExternalRecipientCreation(
    customerName: string,
    accountNumber: string,
    bankCode: string
  ) {
    const recipient = await this.paymentService.createExternalTransferRecipient(
      customerName,
      accountNumber,
      bankCode
    );

    const { active, details, recipient_code } = recipient.data.data;
    const { account_number, account_name, bank_code, bank_name } = details;

    if (!active) {
      this.logger.appLogger.error(
        `External transfer failed: Provider: ${
          PaymentProvider.PAYSTACK
        }, Reason: Inactive account number, Timestamp: ${new Date().toISOString()}`
      );
      throw new AppError("Invalid account number", HttpStatus.BAD_REQUEST);
    }

    this.accountQueue.addJob(AccountJobType.EXTERNAL_ACCOUNT_CREATION, {
      accountName: account_name,
      accountNumber: account_number,
      recipientCode: recipient_code,
      bankCode: bank_code,
      bankName: bank_name,
    } as Partial<ExternalRecipient>);

    return {
      recipientCode: recipient_code,
      bankName: bank_name,
      accountName: account_name,
    };
  }

  async updateExternalTransferTransactionStatus(
    senderAccountId: string,
    transactionStatus: TransactionStatus,
    amount: number,
    reference: string,
    session: {}
  ) {
    return this.datasource.transaction(async (transactionalEntityManager) => {
      if (transactionStatus !== TransactionStatus.SUCCESS) {
        await transactionalEntityManager.findOne(Account, {
          where: { id: senderAccountId },
          select: ["id"],
          lock: { mode: "pessimistic_write" },
        });

        transactionStatus = TransactionStatus.REVERSED;
        
        await transactionalEntityManager.increment(
          Account,
          { id: senderAccountId },
          "balance",
          amount
        );
      }

      await transactionalEntityManager.update(
        Transaction,
        { reference },
        { session, status: transactionStatus }
      );
    });
  }

  private generateTransactionRecord(
    senderAccountId: string,
    amount: number,
    bank: string,
    recipientName: string,
    accountNumber: string,
    reference: string,
    remark?: string
  ): Partial<Transaction> {
    return {
      senderAccountId,
      externalReceiverDetails: {
        name: recipientName,
        bank,
        accountNumber,
      },
      reference,
      amount,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.SUCCESS, // Will be changed to pending when a registered Paystack business account is available
      origin: TransactionOrigin.INTERNAL,
      gateway: TransactionGateway.PAYSTACK,
      remark,
    };
  }

  private generateReference() {
    return uuidv4();
  }

  private logAccountWarning(accountId: string, reason: string) {
    this.logger.appLogger.warn(
      `Transfer failed: User ID ${accountId}. Reason: ${reason}. Timestamp: ${new Date().toISOString()}`
    );
  }
}
