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

    this.router.get(
      '/customers-accounts',
      this.protectMiddleware.restrictTo('admin', 'super_admin'),
      this.accountController.getAllAccounts()
    );

    this.router.post(
      '/customers-accounts/freeze/:id',
      this.protectMiddleware.restrictTo('super_admin'),
      this.accountController.freezeAccount()
    );

    this.router.get(
      '/customers-accounts/:id',
      this.protectMiddleware.restrictTo('admin', 'super_admin'),
      this.accountController.getOneAccount()
    );

    this.router.use(this.protectMiddleware.restrictTo('user'));
    this.router.post('/', this.accountController.createAccount());
    this.router.get('/user-accounts', this.accountController.getAllUserAccounts());
    this.router.get('/user-accounts/:id', this.accountController.getUserAccount());
    this.router.get('/confirm/:accountNumber', this.accountController.confirmAccount());
    this.router.get(
      '/:id/beneficiaries',
      this.accountController.getAccountBeneficiaries()
    );
    this.router.delete(
      '/:id/beneficiaries/:beneficiaryId',
      this.accountController.deleteAccountBeneficiary()
    );
  }

  getRouter() {
    return this.router;
  }
}
