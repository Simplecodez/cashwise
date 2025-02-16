import { singleton } from 'tsyringe';
import { IPaystackPaymentProvider } from '../interfaces/paystack-payment.interface';
import axios, { AxiosInstance } from 'axios';

@singleton()
export class Paystack implements IPaystackPaymentProvider {
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

  async initializeTransaction(email: string, amountInLowerunit: number, reference: string) {
    return this.axiosInstance.post('/transaction/initialize', {
      email,
      amount: amountInLowerunit,
      reference
    });
  }

  async verifyAccountNumber(accountNumber: string, bankCode: string) {
    return this.axiosInstance.get(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
  }

  async createExternalTransferRecipient(name: string, accountNumber: string, bankCode: string) {
    const data = {
      type: 'nuban',
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN'
    };
    return this.axiosInstance.post('/transferrecipient', data);
  }

  async initiateExternalTransfer(amount: number, recipient: string, reference: string, reason?: string) {
    const data = { source: 'balance', amount, recipient, reason, reference };
    return this.axiosInstance.post('/transfer', data);
  }

  async verifyTransaction(reference: string) {
    return this.axiosInstance.get(`/transaction/verify/${reference}`);
  }
}
