import { singleton } from 'tsyringe';
import { FindOneOptions } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/base-user.service';
import { RedisCache } from '../../configs/redis/redis.service';
import { SendEmailOtp } from './send-email-otp.service';
import { EmailType } from '../../communication/email/enum/email.enum';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../../common/http-codes/codes';

@singleton()
export class PasswordRecoveryService {
  constructor(
    private readonly userService: UserService,
    private readonly sendEmailOTPService: SendEmailOtp,
    private readonly cacheService: RedisCache
  ) {}

  private getcacheKey(userId: string) {
    return `user:forgotpassword:${userId}`;
  }

  async forgotPassword(email: string) {
    const options: FindOneOptions<User> = {
      where: { email },
      select: ['id', 'email', 'emailVerifiedAt']
    };

    const user = await this.userService.findUserByOptions(options);

    if (!user) return 'Please check your email for your OTP';

    if (!user.emailVerifiedAt) {
      const signupCacheKey = `user:signup:${user.id}`;
      await this.sendEmailOTPService.sendEmailOtp(
        user,
        signupCacheKey,
        EmailType.SIGNUP_OTP
      );
      throw new AppError('Please verify your email to proceed', HttpStatus.UNAUTHORIZED);
    }

    const cacheKey = this.getcacheKey(user.id);

    await this.sendEmailOTPService.sendEmailOtp(user, cacheKey, EmailType.RESETPASSWORD);

    return 'Please check your email for your OTP';
  }

  async resetPassword(data: { email: string; otp: string; password: string }) {
    const { email, otp, password } = data;

    const options: FindOneOptions<User> = {
      where: { email },
      select: ['id', 'email', 'emailVerifiedAt']
    };

    const user = await this.userService.findUserByOptions(options);

    if (!user || !user.emailVerifiedAt)
      throw new AppError('Unauthorized action.', HttpStatus.UNAUTHORIZED);

    const cacheKey = this.getcacheKey(user.id);

    const cachedOtp = await this.cacheService.get(cacheKey);

    if (!cachedOtp || otp !== cachedOtp)
      throw new AppError('Invalid or expired token', HttpStatus.UNAUTHORIZED);

    await this.userService.updateUserPassword(user.id, password);

    await this.cacheService.del(cacheKey);

    return 'Your password has been updated please sign in.';
  }
}
