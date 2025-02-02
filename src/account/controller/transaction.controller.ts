import { singleton } from 'tsyringe';
import { catchAsync } from '../../utils/catch-async.utils';
import {
  initiateExternalTransferValidator,
  initializeTransactionValidator,
  internalTransferValidator,
  verifyExternalAccountValidator,
  getAccountTransactionValidator,
  getAccountTransactionsValidator
} from '../validator/transaction.validator';
import { IRequest } from '../../user/interfaces/user.interface';
import { Request } from 'express';
import { CommonUtils } from '../../utils/common.utils';
import { InternalTransferData, TransactionJobType } from '../enum/transaction.enum';
import { PaystackWebhookType } from '../../integrations/payments/enum/payment.enum';
import { TransactionService } from '../services/transaction/transaction.service';
import {
  paginationValidator,
  validatePaginationParams
} from '../../common/pagination/pagination/validator';
import { PaginationParams } from '../../common/pagination/pagination/pagination.args';

@singleton()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  transferToInternalAccount() {
    return catchAsync(async (req: IRequest | Request, res) => {
      await internalTransferValidator.validateAsync(req.body, { convert: false });
      const { id: userId, approvedKycLevel } = (req as IRequest).user;

      const { receiverAccountNumber, senderAccountId, amount } =
        req.body as InternalTransferData;

      const { receiverAccountId, amountInLowerUnit, receiverName } =
        await this.transactionService.validateInternalTransferDetail(
          senderAccountId,
          receiverAccountNumber,
          userId,
          amount
        );

      await this.transactionService.checkTransactionLimit(
        senderAccountId,
        amount,
        approvedKycLevel
      );

      this.transactionService.initializeInternalTransfer(
        TransactionJobType.INTERNAL_TRANSFER,
        {
          ...req.body,
          userId,
          amount: amountInLowerUnit,
          receiverAccountId,
          receiverAccountNumber,
          receiverName
        }
      );

      res.json({
        status: 'success',
        message: `${amount} is on it's way to ${receiverAccountNumber}`
      });
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
      const result = await this.transactionService.verifyExternalAccountBeforeTransfer(
        accountNumber,
        bankCode
      );

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
      const { customerName, accountNumber, bankCode, senderAccountId, amount, remark } =
        req.body as {
          customerName: string;
          amount: number;
          accountNumber: string;
          senderAccountId: string;
          bankCode: string;
          remark: string;
        };

      const amountInLowerUnit =
        await this.transactionService.validateSenderAccountandAmount(
          amount,
          senderAccountId,
          userId
        );

      await this.transactionService.checkTransactionLimit(
        senderAccountId,
        amount,
        approvedKycLevel
      );

      const message = await this.transactionService.initiateExternalTransfer(
        senderAccountId,
        customerName,
        accountNumber,
        bankCode,
        amountInLowerUnit,
        remark
      );

      res.json({
        status: 'success',
        message
      });
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
                this.transactionService.addTransactionQueue(
                  TransactionJobType.DEPOSIT_PAYSTACK,
                  {
                    status,
                    reference,
                    amount
                  }
                );
              break;
            }
            case 'transfer.success':
            case 'transfer.failed':
            case 'transfer.reversed': {
              const { status, reference, amount, session } = data;

              if (status && reference && amount)
                this.transactionService.addTransactionQueue(
                  TransactionJobType.EXTERNAL_TRANSFER_PAYSTACK,
                  {
                    status,
                    reference,
                    amount,
                    session
                  }
                );
            }

            default:
              console.log('Unsupported event type');
          }
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
      const transaction = await this.transactionService.getAccountTransaction(
        userId,
        accoundId,
        reference
      );
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
