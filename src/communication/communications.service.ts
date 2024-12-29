import { singleton } from 'tsyringe';
import { TwilioService } from '../integrations/twilio/twilio.service';
import { EmailService } from './email/services/email.service';

@singleton()
export class CommunicationService {
  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: TwilioService
  ) {}

  async sendSMS(phoneNumber: string) {
    return this.smsService.sendVerificationSMS(phoneNumber);
  }

  async sendEmail(data: any) {
    return this.emailService.sendEmail(data);
  }
}
