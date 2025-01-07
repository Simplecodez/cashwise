import { singleton } from 'tsyringe';
import { RedisCache } from '../../configs/redis/redis.service';
import { UserService } from '../../user/services/user/base-user.service';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../../common/http-codes/codes';
import { EmailType } from '../../communication/email/enum/email.enum';
import { FindOneOptions } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { SendEmailOtp } from './send-email-otp.service';

@singleton()
export class EmailVerificationService {
  constructor(
    private readonly cacheService: RedisCache,
    private readonly userService: UserService,
    private readonly sendEmailOtp: SendEmailOtp
  ) {}

  async verify(data: { otp: string; email: string }) {
    const { otp, email } = data;

    const options: FindOneOptions<User> = {
      where: { email }
    };

    const user = await this.userService.findUserByOptions(options);

    if (!user) {
      throw new AppError('User not found, please signup to verify', HttpStatus.NOT_FOUND);
    }

    const cacheKey = `user:signup:${user.id}`;

    const emailVerificationOtp: string = await this.cacheService.get(cacheKey);

    if (otp !== emailVerificationOtp)
      throw new AppError('Invalid or expired token', HttpStatus.UNAUTHORIZED);

    await this.userService.updateUser(
      { field: 'id', value: user.id },
      { emailVerifiedAt: new Date() }
    );

    await this.cacheService.del(cacheKey);

    return true;
  }

  async resendVerifyEmailOTP(email: string) {
    const options: FindOneOptions<User> = {
      where: { email },
      select: ['id', 'emailVerifiedAt', 'email']
    };

    const user = await this.userService.findUserByOptions(options);

    if (!user) throw new AppError('User not found, please signup', HttpStatus.NOT_FOUND);

    if (user.emailVerifiedAt)
      throw new AppError('Email already verified', HttpStatus.BAD_REQUEST);

    const signupCacheKey = `user:signup:${user.id}`;

    await this.sendEmailOtp.sendEmailOtp(user, signupCacheKey, EmailType.SIGNUP_OTP);

    return 'Your email verification OTP has been resent';
  }
}
