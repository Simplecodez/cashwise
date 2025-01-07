import { singleton } from 'tsyringe';
import { catchAsync } from '../../utils/catch-async.utils';
import { IRequest } from '../interfaces/user.interface';
import { Request } from 'express';
import { KycService } from '../services/kyc/kyc.service';
import { validateKycUpdate } from '../validators/kyc.validator';

@singleton()
export class UserController {
  constructor(private readonly kycService: KycService) {}

  getMe() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const user = (req as IRequest).user;

      res.json({
        status: 'success',
        user
      });
    });
  }

  updateKyc() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const user = (req as IRequest).user;
      await validateKycUpdate(user.approvedKycLevel, req.body);

      const message = await this.kycService.updateKyc({ ...req.body, userId: user.id });

      res.json({
        status: 'success',
        message
      });
    });
  }
}
