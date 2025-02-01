import { Router } from 'express';
import { singleton } from 'tsyringe';
import { ProtectMiddleware } from '../../common/middlewares/protect.middleware';
import { UserController } from '../controller/user.controller';

@singleton()
export class UserRouter {
  private router = Router();
  constructor(
    private readonly protectMiddleware: ProtectMiddleware,
    private readonly userController: UserController
  ) {
    this.initialize();
  }

  initialize() {
    this.router.use(this.protectMiddleware.protect());
    this.router.get(
      '/profile',
      this.protectMiddleware.restrictTo('user'),
      this.userController.getMe()
    );
    this.router.patch(
      '/kyc',
      this.protectMiddleware.restrictTo('user'),
      this.userController.updateKyc()
    );
    this.router.use(this.protectMiddleware.restrictTo('admin', 'super_admin'));
    this.router.get('/', this.userController.getAllUsers());
    this.router.get('/:id', this.userController.getOneUser());
  }

  getRouter() {
    return this.router;
  }
}
