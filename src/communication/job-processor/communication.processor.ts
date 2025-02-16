import { Job } from 'bullmq';
import { CommunicationService } from '../communications.service';
import { CommunicationMedium } from '../communications.enum';
import { singleton } from 'tsyringe';
import { BullmqJobError } from '../../utils/job-error.utils';
import { Logger } from '../../common/logger/logger';

@singleton()
export class CommunicationProcessor {
  constructor(
    private readonly communicationService: CommunicationService,
    private readonly logger: Logger
  ) {}

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case CommunicationMedium.EMAIL: {
        try {
          await this.communicationService.sendEmail(job.data);
          this.logger.appLogger.info('Email sent');
        } catch (error: any) {
          this.logger.appLogger.error(
            `Emailing failed: ${error.message}: Timestamp: ${new Date().toISOString()}`
          );
          throw new BullmqJobError(error.message, 'Nodemailer');
        }
        break;
      }

      case CommunicationMedium.SMS: {
        try {
          await this.communicationService.sendSMS(job.data.phoneNumber);
          this.logger.appLogger.info('SMS sent');
        } catch (error: any) {
          this.logger.appLogger.error(
            `SMS failed: ${error.message}: Timestamp: ${new Date().toISOString()}`
          );
          throw new BullmqJobError(error.message, 'Twilio');
        }
        break;
      }

      default:
        break;
    }
  }
}
