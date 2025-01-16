import { singleton } from 'tsyringe';
import { catchAsync } from '../../utils/catch-async.utils';
import { initializeTransactionValidator } from '../validator/transaction.validator';
import { IRequest } from '../../user/interfaces/user.interface';
import { Request } from 'express';
import { TransactionService } from '../services/transaction.service';
import { CommonUtils } from '../../utils/common.utils';

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

  verifyTransaction() {
    return catchAsync(async (req: IRequest | Request, res) => {
      // const result = await this.transactionService.verifyTransaction(req.body.reference);
      console.log(req.body);
      const paystackSignature = req.headers['x-paystack-signature'] as string;
      console.log(
        'comparison result: ',
        CommonUtils.verifyPaystackWebhookSignature(req.body, paystackSignature)
      );
      res.json({
        status: 'success'
      });
    });
  }
}
