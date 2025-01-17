import { singleton } from 'tsyringe';
import { catchAsync } from '../../utils/catch-async.utils';
import { initializeTransactionValidator } from '../validator/transaction.validator';
import { IRequest } from '../../user/interfaces/user.interface';
import { Request } from 'express';
import { TransactionService } from '../services/transaction.service';
import { CommonUtils } from '../../utils/common.utils';
import { TransactionJobType } from '../enum/transaction.enum';
import { PaystackWebhookType } from '../../integrations/payments/enum/payment.enum';

@singleton()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

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
