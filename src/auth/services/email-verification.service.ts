import { singleton } from 'tsyringe';
import { RedisCache } from '../../configs/redis/redis.service';
import { UserService } from '../../user/services/base-user.service';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../../common/http-codes/codes';
import { CommunicationQueue } from '../../communication/job-processor/communication.queue';
import { CommonUtils } from '../../utils/common.utils';
import { CommunicationMedium } from '../../communication/communications.enum';
import { EmailType } from '../../communication/email/enum/email.enum';

@singleton()
export class EmailVerificationService {
  constructor(
    private readonly cacheService: RedisCache,
    private readonly userService: UserService,
    private readonly communicationQueue: CommunicationQueue
  ) {}

  async verify(data: { otp: string; email: string }) {
    const { otp, email } = data;
    const user = await this.userService.findUserByField('email', email);

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
    const user = await this.userService.findUserByField('email', email);

    if (!user) throw new AppError('User not found, please signup', HttpStatus.NOT_FOUND);

    if (user.emailVerifiedAt)
      throw new AppError('Email already verified', HttpStatus.BAD_REQUEST);

    const otp = CommonUtils.generateOtp({
      size: 6,
      digit: true,
      lower: false,
      upper: false
    });

    await this.cacheService.set(`user:signup:${user.id}`, otp, 1200);

    this.communicationQueue.addJob(CommunicationMedium.EMAIL, {
      otp,
      email,
      emailType: EmailType.SIGNUP_OTP
    });

    return 'Your email verification OTP has been resent';
  }
}
