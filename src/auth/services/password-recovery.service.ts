import { singleton } from 'tsyringe';
import { FindOneOptions } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user/base-user.service';
import { RedisCache } from '../../configs/redis/redis.service';
import { SendEmailOtp } from './send-email-otp.service';
import { EmailType } from '../../communication/email/enum/email.enum';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../../common/http-codes/codes';
import { Logger } from '../../common/logger/logger';
import { ActivityQueue } from '../../activity/job-processor/activity.queue';
import { ActivityJobType, ActivityType } from '../../activity/enum/activity.enum';

@singleton()
export class PasswordRecoveryService {
  constructor(
    private readonly userService: UserService,
    private readonly sendEmailOTPService: SendEmailOtp,
    private readonly cacheService: RedisCache,
    private readonly activityQueue: ActivityQueue,
    private readonly logger: Logger
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

    if (!user) {
      this.logger.appLogger.warn(
        `Failed get password reset token attempt for user: ${email}. Timestamp: ${new Date().toISOString()}, Reason: Invalid credentials`
      );
      return 'Please check your email for your password reset OTP';
    }

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

    return 'Please check your email for your password reset OTP';
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

    if (!cachedOtp || otp !== cachedOtp) {
      this.logger.appLogger.warn(
        `Failed password reset attempt for user: ${email}. Timestamp: ${new Date().toISOString()}, Reason: Invalid credentials`
      );
      throw new AppError('Invalid or expired token', HttpStatus.UNAUTHORIZED);
    }
    await this.userService.updateUserPassword(user.id, password);

    await this.cacheService.del(cacheKey);

    this.logger.appLogger.info(
      `Successful password reset attempt for user: ${email}. Timestamp: ${new Date().toISOString()}`
    );

    this.activityQueue.addJob(ActivityJobType.CREATE, {
      userId: user.id,
      type: ActivityType.LOGOUT,
      description: 'You reset your password'
    });

    return 'Your password has been updated please sign in.';
  }
}
