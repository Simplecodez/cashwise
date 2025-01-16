import { Router } from 'express';
import { singleton } from 'tsyringe';
import { ProtectMiddleware } from '../../common/middlewares/protect.middleware';
import { TransactionController } from '../controller/transaction.controller';

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
    this.router.post('/initiate', this.transactionController.initiateDeposit());
    this.router.get('/verify', this.transactionController.verifyTransaction());
  }

  getRouter() {
    return this.router;
  }
}
