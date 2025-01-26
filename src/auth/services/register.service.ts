import { singleton } from 'tsyringe';
import { UserService } from '../../user/services/user/base-user.service';
import { IUser } from '../../user/interfaces/user.interface';
import { CommunicationQueue } from '../../communication/job-processor/communication.queue';
import { CommunicationMedium } from '../../communication/communications.enum';
import { CommonUtils } from '../../utils/common.utils';
import { RedisCache } from '../../configs/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { TwilioService } from '../../integrations/twilio/twilio.service';
import { AppError } from '../../utils/app-error.utils';
import { HttpStatus } from '../../common/http-codes/codes';
import { UserVerificationData } from '../interface/auth.interface';
import { SendEmailOtp } from './send-email-otp.service';
import { EmailType } from '../../communication/email/enum/email.enum';
import { FindOneOptions } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@singleton()
export class RegisterService {
  private readonly userVerificationDataExpiresIn = 3600000;
  private readonly phoneNumberVerificationCacheDuration = 3600;

  constructor(
    private readonly userService: UserService,
    private readonly cacheService: RedisCache,
    private readonly smsService: TwilioService,
    private readonly sendEmailOtp: SendEmailOtp,
    private readonly communicationQueue: CommunicationQueue
  ) {}

  private getVerificationCacheKey(sessionId: string): string {
    return `verify:phonenumber:${sessionId}`;
  }

  async sendPhoneNumberOTP(data: { phoneNumber: string; countryCode: string }) {
    const phoneNumber = CommonUtils.validatePhoneNumber(
      data.phoneNumber,
      data.countryCode
    ) as string;

    const sessionData: UserVerificationData = {
      phoneNumber,
      countryCode: data.countryCode.toUpperCase(),
      isVerified: false,
      createdAt: Date.now()
    };

    const options: FindOneOptions<User> = {
      where: { phoneNumber }
    };

    const user = await this.userService.findUserByOptions(options);

    if (user)
      throw new AppError('Phone number is already in use', HttpStatus.BAD_REQUEST);

    const sessionId = uuidv4();

    const cacheKey = this.getVerificationCacheKey(sessionId);

    await this.cacheService.set(
      cacheKey,
      sessionData,
      this.phoneNumberVerificationCacheDuration
    );

    this.communicationQueue.addJob(CommunicationMedium.SMS, { phoneNumber });

    return {
      message:
        'An OTP has been sent to your phone. Please check your messages to continue',
      sessionId
    };
  }

  async verifyPhoneNumber(data: { otp: string; sessionId: string }) {
    const { otp, sessionId } = data;

    const cacheKey = this.getVerificationCacheKey(sessionId);

    const userVerificationData: UserVerificationData = await this.cacheService.get(
      cacheKey
    );

    if (!userVerificationData) {
      throw new AppError('Invalid or expired session', HttpStatus.UNAUTHORIZED);
    }

    const response = await this.smsService.verifyOTP(
      otp,
      userVerificationData.phoneNumber
    );

    if (!response.data.valid)
      throw new AppError('Invalid or expired token', HttpStatus.UNAUTHORIZED);

    const remainingCacheTime =
      this.userVerificationDataExpiresIn - (Date.now() - userVerificationData.createdAt);

    const remainingCacheTimeInSecs = Math.floor(Math.max(0, remainingCacheTime / 1000));

    userVerificationData.isVerified = true;

    await this.cacheService.set(cacheKey, userVerificationData, remainingCacheTimeInSecs);

    return true;
  }

  async register(data: { userData: IUser; sessionId: string }) {
    const { userData, sessionId } = data;

    const cacheKey = this.getVerificationCacheKey(sessionId);
    const userVerificationData: UserVerificationData = await this.cacheService.get(
      cacheKey
    );

    if (!userVerificationData || !userVerificationData.isVerified) {
      throw new AppError(
        'Please verify your phone number to proceed',
        HttpStatus.BAD_REQUEST
      );
    }

    const newUser = await this.userService.createUser(userData, userVerificationData);

    await this.cacheService.del(cacheKey);

    const signupCacheKey = `user:signup:${newUser.id}`;

    await this.sendEmailOtp.sendEmailOtp(newUser, signupCacheKey, EmailType.SIGNUP_OTP);

    return 'Account created, please check your email for your email verification OTP';
  }
}
