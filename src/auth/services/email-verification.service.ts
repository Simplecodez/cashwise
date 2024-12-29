import { singleton } from 'tsyringe';
import { RedisCache } from '../../configs/redis/redis.service';
import { UserService } from '../../user/services/base-user.service';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../../common/http-codes/codes';
import { CommunicationQueue } from '../../communication/job-processor/communication.queue';
import { CommonUtils } from '../../utils/common.utils';
import { CommunicationMedium } from '../../communication/communications.enum';
import { EmailType } from '../../communication/email/enum/email.enum';
import { FindOneOptions } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { SendEmailOtp } from './send-email-otp.service';

@singleton()
export class EmailVerificationService {
  constructor(
    private readonly cacheService: RedisCache,
    private readonly userService: UserService,
    private readonly sendEmailOtp: SendEmailOtp,
    private readonly communicationQueue: CommunicationQueue
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

    await this.sendEmailOtp.sendEmailOtp(user);

    return 'Your email verification OTP has been resent';
  }
}
