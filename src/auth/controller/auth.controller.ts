import { singleton } from 'tsyringe';
import { BaseAuthService } from '../services/base-auth.service';
import { catchAsync } from '../../utils/catch-async.utils';
import {
  registrationDataValidator,
  resendVerifyEmailOtpValidator,
  sendPhoneNumberOTPValidator,
  verifyEmailValidator,
  verifyPhoneNumberValidator
} from '../../user/validators/user.validator';

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
}
