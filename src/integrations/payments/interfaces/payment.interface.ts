import { AxiosResponse } from 'axios';

export interface IPaymentProvider {
  initializeTransaction(
    email: string,
    amount: number,
    reference: string
  ): Promise<
    AxiosResponse<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>
  >;

  verifyTransaction(reference: string): Promise<AxiosResponse<any>>;
}
