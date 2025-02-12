import { singleton } from 'tsyringe';
import { catchAsync } from '../../utils/catch-async.utils';
import {
  initiateExternalTransferValidator,
  initializeTransactionValidator,
  internalTransferValidator,
  verifyExternalAccountValidator,
  getAccountTransactionValidator,
  getAccountTransactionsValidator,
  completeTransferValidator
} from '../validator/transaction.validator';
import { IRequest } from '../../user/interfaces/user.interface';
import { Request } from 'express';
import { CommonUtils } from '../../utils/common.utils';
import { InternalTransferData, TransactionJobType } from '../enum/transaction.enum';
import { PaystackWebhookType } from '../../integrations/payments/enum/payment.enum';
import { TransactionService } from '../services/transaction/transaction.service';
import { validatePaginationParams } from '../../common/pagination/pagination/validator';
import { Logger } from '../../common/logger/logger';

@singleton()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService, private readonly logger: Logger) {}

  completeTransfer() {
    return catchAsync(async (req: IRequest | Request, res) => {
      await completeTransferValidator.validateAsync({ ...req.body, ...req.params });
      const { id: transactionKey } = req.params;
      const { passcode, passphrase } = req.body as Record<string, string>;
      let passcodeOrPassphrase = passcode;

      if (!passcodeOrPassphrase) passcodeOrPassphrase = passphrase;

      const message = await this.transactionService.completeTransfer(transactionKey, passcodeOrPassphrase);

      res.json({
        status: 'success',
        message
      });
    });
  }

  initiateInternalTransfer() {
    return catchAsync(async (req: IRequest | Request, res) => {
      await internalTransferValidator.validateAsync(req.body, { convert: false });
      const { id: userId, approvedKycLevel } = (req as IRequest).user;

      const { receiverAccountNumber, senderAccountId, amount, remark } = req.body as InternalTransferData;

      const validationResult = await this.transactionService.validateInternalTransferDetails(
        senderAccountId,
        receiverAccountNumber,
        userId,
        approvedKycLevel,
        TransactionJobType.INTERNAL_TRANSFER,
        amount,
        remark
      );

      res.json(validationResult);
    });
  }

  initiateDeposit() {
    return catchAsync(async (req: IRequest | Request, res) => {
      await initializeTransactionValidator.validateAsync(req.body, { convert: false });
      const { email, id: userId } = (req as IRequest).user;
      const { amount, provider, receiverAccountId } = req.body;

      const result = await this.transactionService.initiateDeposit(provider, {
        email,
        amount,
        userId,
        receiverAccountId
      });

      res.json({
        status: 'success',
        data: result
      });
    });
  }

  verifyExternalUserAccountDetail() {
    return catchAsync(async (req, res) => {
      await verifyExternalAccountValidator.validateAsync(req.body);
      const { accountNumber, bankCode } = req.body as {
        accountNumber: string;
        bankCode: string;
      };
      const result = await this.transactionService.verifyExternalAccount(accountNumber, bankCode);

      res.json({
        status: 'success',
        data: result.data.data
      });
    });
  }

  initiateExternalTransfer() {
    return catchAsync(async (req: IRequest | Request, res) => {
      await initiateExternalTransferValidator.validateAsync(req.body);

      const { id: userId, approvedKycLevel } = (req as IRequest).user;
      const { accountNumber, bankCode, senderAccountId, amount, remark } = req.body as {
        amount: number;
        accountNumber: string;
        senderAccountId: string;
        bankCode: string;
        remark: string;
      };

      const validationResult = await this.transactionService.validateExternalTransferDetails(
        userId,
        approvedKycLevel,
        senderAccountId,
        accountNumber,
        amount,
        bankCode,
        remark
      );

      res.json(validationResult);
    });
  }

  handlePaystackTransactionWebhook() {
    return catchAsync(async (req, res) => {
      const paystackSignature = req.headers['x-paystack-signature'] as string;
      const body = req.body as PaystackWebhookType;
      const { event, data } = body;

      if (paystackSignature && body) {
        if (CommonUtils.verifyPaystackWebhookSignature(body, paystackSignature))
          switch (event) {
            case 'charge.success': {
              const { status, reference, amount } = data;

              if (status && reference && amount)
                this.transactionService.addTransactionQueue(TransactionJobType.DEPOSIT_PAYSTACK, {
                  status,
                  reference,
                  amount
                });
              break;
            }
            case 'transfer.success':
            case 'transfer.failed':
            case 'transfer.reversed': {
              const { status, reference, amount, session } = data;

              if (status && reference && amount)
                this.transactionService.addTransactionQueue(TransactionJobType.EXTERNAL_TRANSFER_PAYSTACK, {
                  status,
                  reference,
                  amount,
                  session
                });
            }

            default:
              this.logger.appLogger.info(`Unsupported webhook event, Timestamp: ${new Date().toISOString()}`);
              break;
          }
      } else {
        this.logger.appLogger.info(`Invalid webhook signature, Timestamp: ${new Date().toISOString()}`);
      }

      res.json({
        status: 'success'
      });
    });
  }

  getAccountTransactions() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const { paginationParams } = await validatePaginationParams(
        req.query as { limit: string; nextCursor?: string; filter?: string }
      );
      const { id: userId } = (req as IRequest).user;

      await getAccountTransactionsValidator.validateAsync(req.params);
      const transactions = await this.transactionService.getAccountTransactions(
        userId,
        req.params.id,
        paginationParams
      );

      res.json({
        status: 'success',
        transactions
      });
    });
  }

  getAccountTransaction() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const { id: userId } = (req as IRequest).user;
      await getAccountTransactionValidator.validateAsync(req.params);
      const { id: accoundId, reference } = req.params;
      const transaction = await this.transactionService.getAccountTransaction(userId, accoundId, reference);
      res.json({
        status: 'success',
        transaction
      });
    });
  }

  getAllTransactions() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const { paginationParams, parsedFilter } = await validatePaginationParams(
        req.query as { limit: string; nextCursor?: string; filter?: string }
      );

      const userRole = (req as IRequest).user.role;

      const transactions = await this.transactionService.getTransactions(
        userRole,
        paginationParams,
        parsedFilter
      );

      res.json({
        status: 'success',
        transactions
      });
    });
  }
}
