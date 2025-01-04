import axios from 'axios';
import { singleton } from 'tsyringe';

@singleton()
export class TwilioService {
  private readonly AxiosTimeout = 30000;
  constructor() {}

  private async initializeSend(data: URLSearchParams, apiURL: string) {
    return axios.post(apiURL, data, {
      auth: {
        username: process.env.TWILIO_SID as string,
        password: process.env.TWILIO_AUTH_TOKEN as string
      },
      timeout: this.AxiosTimeout
    });
  }

  async sendVerificationSMS(recipient: string) {
    const apiURL = process.env.TWILIO_VERIFY_URL as string;

    const data = new URLSearchParams({
      To: recipient,
      Channel: 'sms'
    });

    return this.initializeSend(data, apiURL);
  }

  async verifyOTP(otp: string, recipient: string) {
    const apiURL = process.env.TWILIO_VERIFY_CHECK_URL as string;

    const data = new URLSearchParams({
      To: recipient,
      Code: otp
    });

    return this.initializeSend(data, apiURL);
  }
}
