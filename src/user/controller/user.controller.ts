import { singleton } from 'tsyringe';
import { catchAsync } from '../../utils/catch-async.utils';
import { IRequest } from '../interfaces/user.interface';
import { Request } from 'express';
import { KycService } from '../services/kyc/kyc.service';
import { validateKycUpdate } from '../validators/kyc.validator';
import { validatePaginationParams } from '../../common/pagination/pagination/validator';
import { UserService } from '../services/user/base-user.service';
import { getOneUserValidator } from '../validators/user.validator';

@singleton()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly kycService: KycService
  ) {}

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
      const {
        id: userId,
        approvedKycLevel,
        firstName,
        lastName
      } = (req as IRequest).user;
      await validateKycUpdate(approvedKycLevel, req.body);

      const message = await this.kycService.updateKyc({
        ...req.body,
        userId,
        username: `${firstName} ${lastName}`
      });

      res.json({
        status: 'success',
        message
      });
    });
  }

  getAllUsers() {
    return catchAsync(async (req: IRequest | Request, res) => {
      const { paginationParams, parsedFilter } = await validatePaginationParams(
        req.query as { limit: string; nextCursor?: string; filter?: string }
      );
      const userRole = (req as IRequest).user.role;

      const users = await this.userService.findAllUsers(
        userRole,
        paginationParams,
        parsedFilter
      );

      res.json({
        status: 'success',
        users
      });
    });
  }

  getOneUser() {
    return catchAsync(async (req: IRequest | Request, res) => {
      await getOneUserValidator.validateAsync(req.params);
      const userRole = (req as IRequest).user.role;

      const user = await this.userService.findOneUser(userRole, req.params.id);

      res.json({
        status: 'success',
        user
      });
    });
  }
}
