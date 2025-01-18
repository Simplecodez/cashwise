import { singleton } from 'tsyringe';
import { catchAsync } from '../../utils/catch-async.utils';
import {
  initializeTransactionValidator,
  internalTransferValidator
} from '../validator/transaction.validator';
import { IRequest } from '../../user/interfaces/user.interface';
import { Request } from 'express';
import { CommonUtils } from '../../utils/common.utils';
import { InternalTransferData, TransactionJobType } from '../enum/transaction.enum';
import { PaystackWebhookType } from '../../integrations/payments/enum/payment.enum';
import { TransactionService } from '../services/transaction/transaction.service';

@singleton()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  transferToInternalAccount() {
    return catchAsync(async (req: IRequest | Request, res) => {
      await internalTransferValidator.validateAsync(req.body, { convert: false });
      const { approvedKycLevel, id: userId } = (req as IRequest).user;

      const { receiverAccountNumber, senderAccountId, amount } =
        req.body as InternalTransferData;

      const { receiverAccountId, amountInLowerUnit } =
        await this.transactionService.validateInternalTransferDetail(
          senderAccountId,
          receiverAccountNumber,
          userId,
          amount,
          approvedKycLevel
        );

      this.transactionService.initializeInternalTransfer(
        TransactionJobType.INTERNAL_TRANSFER,
        { ...req.body, userId, amount: amountInLowerUnit, receiverAccountId }
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

  handleDepositTransaction() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const paystackSignature = req.headers['x-paystack-signature'] as string;
      const body = req.body as PaystackWebhookType;
      const { event, data } = body;
      console.log(body, paystackSignature);

      if (paystackSignature && body) {
        if (
          CommonUtils.verifyPaystackWebhookSignature(body, paystackSignature) &&
          event === 'charge.success'
        ) {
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
        }
      }

      res.json({
        status: 'success'
      });
    });
  }
}
