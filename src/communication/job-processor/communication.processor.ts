import { Job } from 'bullmq';
import { CommunicationService } from '../communications.service';
import { CommunicationMedium } from '../communications.enum';
import { singleton } from 'tsyringe';

@singleton()
export class CommunicationProcessor {
  constructor(private readonly communicationService: CommunicationService) {}

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case CommunicationMedium.EMAIL: {
        try {
          await this.communicationService.sendEmail(job.data);
        } catch (error) {
          console.log(error);
          throw error;
        }
        break;
      }

      case CommunicationMedium.SMS: {
        try {
          await this.communicationService.sendSMS(job.data.phoneNumber);
        } catch (error) {
          console.log(error);
          throw error;
        }
        break;
      }

      default:
        break;
    }
  }
}
