import { Router } from 'express';
import { ProtectMiddleware } from '../../common/middlewares/protect.middleware';
import { ActivityController } from '../activity.controller';
import { singleton } from 'tsyringe';

@singleton()
export class ActivityRouter {
  private router = Router();
  constructor(
    private readonly activityController: ActivityController,
    private readonly protectMiddleware: ProtectMiddleware
  ) {
    this.initialize();
  }

  initialize() {
    this.router.use(this.protectMiddleware.protect());
    this.router.use(this.protectMiddleware.restrictTo('user', 'admin', 'super_admin'));
    this.router.get('/', this.activityController.getUserActivities());
  }

  get getRouter() {
    return this.router;
  }
}
