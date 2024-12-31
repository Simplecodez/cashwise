import { singleton } from 'tsyringe';
import { catchAsync } from '../../utils/catch-async.utils';
import { IRequest } from '../interfaces/user.interface';
import { Request } from 'express';

@singleton()
export class UserController {
  getMe() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const user = (req as IRequest).user;

      res.json({
        status: 'success',
        user
      });
    });
  }
}
