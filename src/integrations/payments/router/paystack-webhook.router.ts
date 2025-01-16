import { Router } from 'express';
import { singleton } from 'tsyringe';
import { TransactionController } from '../../../account/controller/transaction.controller';

@singleton()
export class PaystackWebhookRouter {
  private router = Router();
  constructor(private readonly transactionController: TransactionController) {
    this.initialize();
  }

  private initialize() {
    this.router.post('/webhook', this.transactionController.verifyTransaction());
  }

  getRouter() {
    return this.router;
  }
}
