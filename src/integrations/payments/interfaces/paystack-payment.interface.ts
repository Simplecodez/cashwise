import { AxiosResponse } from 'axios';

export interface IPaystackPaymentProvider {
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

  verifyAccountDetailBeforeExternalTransfer(
    accountNumber: string,
    bankCode: string
  ): Promise<
    AxiosResponse<{
      status: boolean;
      message: string;
      data: {
        account_number: string;
        account_name: string;
        bank_id: 9;
      };
    }>
  >;

  createExternalTransferRecipient(
    name: string,
    accountNumber: string,
    bankCode: string
  ): Promise<
    AxiosResponse<{
      data: {
        active: boolean;
        is_deleted: boolean;
        details: {
          authorization_code: string;
          account_number: string;
          account_name: string;
          bank_code: string;
          bank_name: string;
        };
        recipient_code: string;
      };
    }>
  >;

  initiateExternalTransfer(
    amount: number,
    recipient: string,
    reference: string,
    reason?: string
  ): Promise<
    AxiosResponse<{
      status: boolean;
      message: string;
      data: {
        integration: number;
        amount: number;
        reason: string;
        recipient: number;
        status: string;
        transfer_code: string;
      };
    }>
  >;

  verifyTransaction(reference: string): Promise<AxiosResponse<any>>;
}
