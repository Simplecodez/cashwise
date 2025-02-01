import { singleton } from 'tsyringe';
import { UserService } from '../../user/services/user/base-user.service';
import { IncomingHttpHeaders } from 'http';
import { NextFunction, Request, Response } from 'express';
import { catchAsync } from '../../utils/catch-async.utils';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../http-codes/codes';
import { CommonUtils } from '../../utils/common.utils';
import { FindOneOptions } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { IRequest } from '../../user/interfaces/user.interface';

@singleton()
export class ProtectMiddleware {
  constructor(private readonly userService: UserService) {}

  private extractJWTToken(reqAuth: {
    headers: IncomingHttpHeaders;
    cookies: { authToken: string };
  }) {
    let token: string | undefined;
    if (
      reqAuth.headers.authorization &&
      reqAuth.headers.authorization.startsWith('Bearer')
    ) {
      token = reqAuth.headers.authorization.split(' ')[1];
    } else if (reqAuth.cookies && reqAuth.cookies.authToken) {
      token = reqAuth.cookies.authToken;
    }
    return token;
  }

  private async authenticate(reqAuth: {
    headers: IncomingHttpHeaders;
    cookies: { authToken: string };
  }) {
    const authToken = this.extractJWTToken(reqAuth);
    if (!authToken)
      throw new AppError('Please, provide a valid token', HttpStatus.UNAUTHORIZED);

    const decoded: { id: string; tokenVersion: string } =
      await CommonUtils.verifyJWTToken(authToken);

    if (!decoded.id || !decoded.tokenVersion)
      throw new AppError('Invalid token', HttpStatus.UNAUTHORIZED);

    const options: FindOneOptions<User> = {
      where: { id: decoded.id, tokenVersion: decoded.tokenVersion },
      select: [
        'id',
        'firstName',
        'lastName',
        'email',
        'username',
        'emailVerifiedAt',
        'phoneNumber',
        'approvedKycLevel',
        'role'
      ]
    };

    const user = await this.userService.findUserByOptions(options);

    if (!user || !user.emailVerifiedAt)
      throw new AppError(
        'You are not authorised for this action, please sign in.',
        HttpStatus.UNAUTHORIZED
      );
    const { emailVerifiedAt, ...remainingUserData } = user;
    return remainingUserData as User;
  }

  protect() {
    return catchAsync(async (req: Request | IRequest, res, next) => {
      const authorisedUser = await this.authenticate({
        headers: (req as Request).headers,
        cookies: { authToken: (req as Request).cookies?.authToken }
      });

      (req as IRequest).user = authorisedUser;
      (next as NextFunction)();
    });
  }

  restrictTo(...roles: string[]) {
    return catchAsync(async (req: Request | IRequest, res, next) => {
      const userRole = (req as IRequest).user.role;
      if (!roles.includes(userRole))
        throw new AppError('Access forbidden', HttpStatus.FORBIDDEN);

      (next as NextFunction)();
    });
  }
}
