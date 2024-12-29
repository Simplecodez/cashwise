import { Router } from 'express';
import { AuthController } from '../controller/auth.controller';
import { singleton } from 'tsyringe';
import { ProtectMiddleware } from '../../common/middlewares/protect.middleware';

@singleton()
export class AuthRouter {
  private router = Router();
  constructor(
    private readonly authController: AuthController,
    private readonly protectMiddleware: ProtectMiddleware
  ) {
    this.initialize();
  }

  initialize() {
    this.router.post('/send-phone-otp', this.authController.sendPhoneNumberOTP());
    this.router.post('/verify-phone-number', this.authController.verifyPhoneNumber());
    this.router.post('/register', this.authController.registerUser());
    this.router.post('/verify-email', this.authController.verifyEmail());
    this.router.post('/resend-email-otp', this.authController.resendVerifyEmailOTP());
    this.router.post('/signin', this.authController.signin());
    this.router.post(
      '/signout',
      this.protectMiddleware.protect(),
      this.authController.signout()
    );

    this.router.post('/forgot-password', this.authController.forgotPassword());
    this.router.post('/reset-password', this.authController.resetPassword());
  }

  getRouter() {
    return this.router;
  }
}
