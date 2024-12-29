import { singleton } from 'tsyringe';
import { RegisterService } from './register.service';
import { IUser } from '../../user/interfaces/user.interface';
import { EmailVerificationService } from './email-verification.service';

@singleton()
export class BaseAuthService {
  constructor(
    private readonly registerService: RegisterService,
    private readonly emailVerificationService: EmailVerificationService
  ) {}

  async sendPhoneNumberOTP(data: { phoneNumber: string; countryCode: string }) {
    return this.registerService.sendPhoneNumberOTP(data);
  }

  async verifyPhoneNumber(data: { otp: string; sessionId: string }) {
    return this.registerService.verifyPhoneNumber(data);
  }

  async register(data: { userData: IUser; sessionId: string }) {
    return this.registerService.register(data);
  }

  async verifyEmail(data: { otp: string; email: string }) {
    return this.emailVerificationService.verify(data);
  }

  async resendVerifyEmailOTP(email: string) {
    return this.emailVerificationService.resendVerifyEmailOTP(email);
  }
}
