import { singleton } from 'tsyringe';
import { RegisterService } from './register.service';
import { IUser } from '../../user/interfaces/user.interface';
import { EmailVerificationService } from './email-verification.service';
import { AccountAccessService } from './access.service';
import { PasswordRecoveryService } from './password-recovery.service';

@singleton()
export class BaseAuthService {
  constructor(
    private readonly registerService: RegisterService,
    private readonly accountAccessService: AccountAccessService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordRecoveryService: PasswordRecoveryService
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

  async signin(signinPayload: { user: string; password: string }) {
    return this.accountAccessService.signin(signinPayload);
  }

  async signout(userId: string) {
    return this.accountAccessService.signout(userId);
  }

  async forgotPassword(email: string) {
    return this.passwordRecoveryService.forgotPassword(email);
  }

  async resetPassword(data: { email: string; otp: string; password: string }) {
    return this.passwordRecoveryService.resetPassword(data);
  }
}
