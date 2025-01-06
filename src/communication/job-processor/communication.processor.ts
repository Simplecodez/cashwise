import { Job } from 'bullmq';
import { CommunicationService } from '../communications.service';
import { CommunicationMedium } from '../communications.enum';
import { singleton } from 'tsyringe';
import { BullmqJobError } from '../../utils/job-error.utils';

@singleton()
export class CommunicationProcessor {
  constructor(private readonly communicationService: CommunicationService) {}

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case CommunicationMedium.EMAIL: {
        try {
          await this.communicationService.sendEmail(job.data);
        } catch (error: any) {
          throw new BullmqJobError(error.message, 'Nodemailer');
        }
        break;
      }

      case CommunicationMedium.SMS: {
        try {
          await this.communicationService.sendSMS(job.data.phoneNumber);
        } catch (error: any) {
          throw new BullmqJobError(error.message, 'Twilio');
        }
        break;
      }

      default:
        break;
    }
  }
}
