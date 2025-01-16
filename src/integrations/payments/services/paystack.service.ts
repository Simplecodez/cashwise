import { singleton } from 'tsyringe';
import { IPaymentProvider } from '../interfaces/payment.interface';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

@singleton()
export class Paystack implements IPaymentProvider {
  private axiosInstance: AxiosInstance;
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.PAYSTACK_BASE_URL,
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async initializeTransaction(
    email: string,
    amountInLowerunit: number,
    reference: string
  ) {
    return this.axiosInstance.post('/transaction/initialize', {
      email,
      amount: amountInLowerunit,
      reference
    });
  }

  async verifyTransaction(reference: string) {
    return this.axiosInstance.get(`/transaction/verify/${reference}`);
  }
}
