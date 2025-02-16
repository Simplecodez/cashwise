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

  private initialize() {
    this.router.use(this.protectMiddleware.protect());

    this.router.get(
      '/',
      this.protectMiddleware.restrictTo('admin', 'super_admin'),
      this.transactionController.getAllTransactions()
    );
    this.router.use(this.protectMiddleware.restrictTo('user'));
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
      this.transactionController.initiateInternalTransfer()
    );

    this.router.post('/complete-transfer/:id', this.transactionController.completeTransfer());
    this.router.get('/account/:id', this.transactionController.getAccountTransactions());
    this.router.get('/account/:id/:reference', this.transactionController.getAccountTransaction());
  }

  get getRouter() {
    return this.router;
  }
}
