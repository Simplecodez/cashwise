import { Router } from 'express';
import { AuthController } from '../controller/auth.controller';
import { singleton } from 'tsyringe';

@singleton()
export class AuthRouter {
  private router = Router();
  constructor(private authController: AuthController) {
    this.initialize();
  }

  initialize() {
    this.router.post('/send-phone-otp', this.authController.sendPhoneNumberOTP());
    this.router.post('/verify-phone-number', this.authController.verifyPhoneNumber());
    this.router.post('/register', this.authController.registerUser());
    this.router.post('/verify-email', this.authController.verifyEmail());
    this.router.post('/resend-email-otp', this.authController.resendVerifyEmailOTP());
  }

  getRouter() {
    return this.router;
  }
}
