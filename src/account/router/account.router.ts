import { Router } from 'express';
import { singleton } from 'tsyringe';
import { ProtectMiddleware } from '../../common/middlewares/protect.middleware';
import { AccountController } from '../controller/account.controller';

@singleton()
export class AccountRouter {
  private router = Router();
  constructor(
    private readonly protectMiddleware: ProtectMiddleware,
    private readonly accountController: AccountController
  ) {
    this.initialize();
  }

  initialize() {
    this.router.use(this.protectMiddleware.protect());
    this.router.post('/', this.accountController.createAccount());
    this.router.get('/', this.accountController.getAllUserAccounts());
    this.router.get('/:id', this.accountController.getUserAccount());
    this.router.get(
      '/:id/beneficiaries',
      this.accountController.getAccountBeneficiaries()
    );
    this.router.delete(
      '/:id/beneficiaries/:beneficiaryId',
      this.accountController.deleteAccountBeneficiary()
    );
    this.router.get('/confirm/:accountNumber', this.accountController.confirmAccount());
  }

  getRouter() {
    return this.router;
  }
}
