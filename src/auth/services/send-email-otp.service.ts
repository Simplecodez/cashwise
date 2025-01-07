import { singleton } from 'tsyringe';
import { RedisCache } from '../../configs/redis/redis.service';
import { CommunicationQueue } from '../../communication/job-processor/communication.queue';
import { CommonUtils } from '../../utils/common.utils';
import { User } from '../../user/entities/user.entity';
import { CommunicationMedium } from '../../communication/communications.enum';
import { EmailType } from '../../communication/email/enum/email.enum';

@singleton()
export class SendEmailOtp {
  private readonly verificationCacheDuration = 1200;
  constructor(
    private readonly cacheService: RedisCache,
    private readonly communicationQueue: CommunicationQueue
  ) {}

  async sendEmailOtp(user: User, cacheKey: string, emailType: EmailType) {
    const otp = CommonUtils.generateOtp({
      size: 6,
      digit: true,
      upper: false,
      lower: false
    });

    await this.cacheService.set(cacheKey, otp, this.verificationCacheDuration);

    this.communicationQueue.addJob(CommunicationMedium.EMAIL, {
      otp,
      email: user.email,
      emailType
    });
  }
}
