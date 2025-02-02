import { singleton } from 'tsyringe';
import { UserService } from '../../user/services/user/base-user.service';
import { FindOneOptions } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../../common/http-codes/codes';
import { CommonUtils } from '../../utils/common.utils';
import { SendEmailOtp } from './send-email-otp.service';
import { v4 as uuidv4 } from 'uuid';
import { EmailType } from '../../communication/email/enum/email.enum';
import { Logger } from '../../common/logger/logger';
import { ActivityQueue } from '../../activity/job-processor/activity.queue';
import { ActivityJobType, ActivityType } from '../../activity/enum/activity.enum';

@singleton()
export class AccountAccessService {
  constructor(
    private readonly userService: UserService,
    private readonly sendEmailOtp: SendEmailOtp,
    private readonly activityQueue: ActivityQueue,
    private readonly logger: Logger
  ) {}

  async signin(signinPayload: { user: string; password: string }) {
    const { user: usernameOrEmail, password } = signinPayload;

    const options: FindOneOptions<User> = {
      where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      select: ['id', 'firstName', 'lastName', 'email', 'emailVerifiedAt', 'tokenVersion']
    };

    const user = await this.userService.findUserByOptions(options);

    if (!user) {
      this.logger.appLogger.warn(
        `Failed login attempt for user: ${usernameOrEmail}, Timestamp: ${new Date().toISOString()}, Reason: Invalid credentials`
      );
      throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    if (!user.emailVerifiedAt) {
      const signupCacheKey = `user:signup:${user.id}`;
      await this.sendEmailOtp.sendEmailOtp(user, signupCacheKey, EmailType.SIGNUP_OTP);

      throw new AppError(
        'Please checkout your email and verify your profile',
        HttpStatus.UNAUTHORIZED
      );
    }

    const userPassword = await this.userService.retrieveUserPassword(user.id);

    const isPasswordMatch = await CommonUtils.verifyPassword(
      password,
      userPassword?.passwordHash as string
    );

    if (!isPasswordMatch) {
      this.logger.appLogger.warn(
        `Failed login attempt for user: ${usernameOrEmail}, Timestamp: ${new Date().toISOString()}, Reason: Invalid credentials`
      );
      throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const payload = { id: user.id, tokenVersion: user.tokenVersion };

    const authToken = CommonUtils.signToken(payload, '1h');

    const { emailVerifiedAt, tokenVersion, ...remainingUserData } = user;

    this.logger.appLogger.info(
      `Successful login attempt for user: ${usernameOrEmail}. Timestamp: ${new Date().toISOString()}`
    );
    this.activityQueue.addJob(ActivityJobType.CREATE, {
      userId: user.id,
      type: ActivityType.LOGIN,
      description: 'You logged in'
    });
    return { user: remainingUserData, authToken };
  }

  async signout(userId: string) {
    const options: FindOneOptions<User> = {
      where: { id: userId },
      select: ['id', 'tokenVersion', 'emailVerifiedAt']
    };
    const user = await this.userService.findUserByOptions(options);

    if (!user || !user.emailVerifiedAt)
      throw new AppError('You are unathorised for this action', HttpStatus.UNAUTHORIZED);

    await this.userService.updateUser(
      { field: 'id', value: userId },
      { tokenVersion: uuidv4() }
    );
    this.activityQueue.addJob(ActivityJobType.CREATE, {
      userId: user.id,
      type: ActivityType.LOGOUT,
      description: 'You logged out'
    });
    return 'Signed out successfully';
  }
}
