import express, { Application } from 'express';
import { singleton } from 'tsyringe';
import { AuthRouter } from './auth/router/auth.router';
import { GlobalErrorHandler } from './common/error/global-error.handler';
import { BullBoardRouter } from './configs/bull/bull-board.router';
import { HttpStatus } from './common/http-codes/codes';
import { UserRouter } from './user/router/user.router';
import { AccountRouter } from './account/router/account.router';

@singleton()
export class App {
  private app: Application;

  constructor(
    private readonly authRouter: AuthRouter,
    private readonly userRouter: UserRouter,
    private readonly accountRouter: AccountRouter,
    private readonly bullboardRouter: BullBoardRouter
  ) {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeGlobalRouteHandling();
    this.initializeErrorHandling();
  }

  private initializeMiddleware() {
    this.app.use(express.json({ limit: '25kb' }));
  }

  private initializeRoutes() {
    this.app.get('/', (req, res) => {
      res.send('Welcome to Cashwise APIs');
    });
    this.app.use('/api/v1/users', this.userRouter.getRouter());
    this.app.use('/api/v1/auth', this.authRouter.getRouter());
    this.app.use('/api/v1/accounts', this.accountRouter.getRouter());
    this.app.use('/admin/queues', this.bullboardRouter.getRouter());
  }

  private initializeGlobalRouteHandling() {
    this.app.use('*', (req, res, next) => {
      res.status(HttpStatus.NOT_FOUND).json({
        status: 'fail',
        message: `Cannot find ${req.originalUrl} on this server`
      });
    });
  }

  private initializeErrorHandling() {
    this.app.use(GlobalErrorHandler.errorHandler());
  }
  public start(port: number) {
    this.app.listen(port, () => {
      console.log(`Application running on port ${port}`);
    });
  }
}
