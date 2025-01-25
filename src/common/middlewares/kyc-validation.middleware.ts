import { NextFunction, Request } from 'express';
import { IRequest } from '../../user/interfaces/user.interface';
import { catchAsync } from '../../utils/catch-async.utils';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../http-codes/codes';

const permittedKycLevel = ['level_1', 'level_2', 'level_3'];

export const checkKycLevel = () => {
  return catchAsync(async (req: IRequest | Request, res, next) => {
    const { approvedKycLevel } = (req as IRequest).user;

    if (!permittedKycLevel.includes(approvedKycLevel))
      throw new AppError('Please complete your KYC to proceed', HttpStatus.FORBIDDEN);

    (next as NextFunction)();
  });
};
