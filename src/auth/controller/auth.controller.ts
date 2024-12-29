import { singleton } from 'tsyringe';
import { BaseAuthService } from '../services/base-auth.service';
import { catchAsync } from '../../utils/catch-async.utils';
import {
  registrationDataValidator,
  resendVerifyEmailOtpValidator,
  sendPhoneNumberOTPValidator,
  signinValidator,
  verifyEmailValidator,
  verifyPhoneNumberValidator
} from '../../user/validators/user.validator';
import { Request } from 'express';
import { IRequest } from '../../user/interfaces/user.interface';

@singleton()
export class AuthController {
  constructor(private baseAuthService: BaseAuthService) {}

  sendPhoneNumberOTP() {
    return catchAsync(async (req, res) => {
      await sendPhoneNumberOTPValidator.validateAsync(req.body);
      const data = await this.baseAuthService.sendPhoneNumberOTP(req.body);

      res.json({
        status: 'success',
        data
      });
    });
  }

  verifyPhoneNumber() {
    return catchAsync(async (req, res) => {
      await verifyPhoneNumberValidator.validateAsync(req.body);
      const verificationResult = await this.baseAuthService.verifyPhoneNumber(req.body);

      res.json({
        status: 'success',
        verification: verificationResult
      });
    });
  }

  registerUser() {
    return catchAsync(async (req, res) => {
      await registrationDataValidator.validateAsync(req.body);

      const data = await this.baseAuthService.register(req.body);

      res.json({
        status: 'success',
        data
      });
    });
  }

  verifyEmail() {
    return catchAsync(async (req, res) => {
      await verifyEmailValidator.validateAsync(req.body);
      const verificationResult = await this.baseAuthService.verifyEmail(req.body);

      res.json({
        status: 'success',
        verification: verificationResult
      });
    });
  }

  resendVerifyEmailOTP() {
    return catchAsync(async (req, res) => {
      await resendVerifyEmailOtpValidator.validateAsync(req.body);
      const message = await this.baseAuthService.resendVerifyEmailOTP(req.body.email);

      res.json({
        status: 'success',
        message
      });
    });
  }

  signin() {
    return catchAsync(async (req, res) => {
      await signinValidator.validateAsync(req.body);
      const signinResult = await this.baseAuthService.signin(req.body);

      res.json({
        status: 'success',
        data: signinResult
      });
    });
  }

  signout() {
    return catchAsync(async (req: Request | IRequest, res) => {
      const userId = (req as IRequest).user.id;

      const signoutResult = await this.baseAuthService.signout(userId);

      res.json({
        status: 'success',
        message: signoutResult
      });
    });
  }
}
