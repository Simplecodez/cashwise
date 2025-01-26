import { Router } from 'express';
import { singleton } from 'tsyringe';
import { ProtectMiddleware } from '../../common/middlewares/protect.middleware';
import { TransactionController } from '../controller/transaction.controller';
import { checkKycLevel } from '../../common/middlewares/kyc-validation.middleware';

@singleton()
export class TransactionRouter {
  private router = Router();
  constructor(
    private readonly protectMiddleware: ProtectMiddleware,
    private readonly transactionController: TransactionController
  ) {
    this.initialize();
  }

  initialize() {
    this.router.use(this.protectMiddleware.protect());
    this.router.use(checkKycLevel());
    this.router.post('/initiate-deposit', this.transactionController.initiateDeposit());
    this.router.post(
      '/verify-external-account',
      this.transactionController.verifyExternalUserAccountDetail()
    );

    this.router.post(
      '/initiate-external-transfer',
      this.transactionController.initiateExternalTransfer()
    );
    this.router.post(
      '/initiate-internal-transfer',
      this.transactionController.transferToInternalAccount()
    );

    this.router.get('/account/:id', this.transactionController.getAccountTransactions());
  }

  getRouter() {
    return this.router;
  }
}
