import { KycLevel } from '../../user/enum/kyc.enum';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  TRANSFER = 'TRANSFER',
  REFUND = 'REFUND'
}

export enum TransactionEntryType {
  CREDIT = 'credit',
  DEBIT = 'debit'
}

export enum TransactionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
  REVERSED = 'reversed'
}

export enum TransactionOrigin {
  INTERNAL = 'internal',
  EXTERNAL = 'external'
}

export enum TransactionGateway {
  PAYSTACK = 'paystack',
  STRIPE = 'stripe',
  NONE = 'none'
}

export enum TransactionJobType {
  DEPOSIT_PAYSTACK = 'deposit.paystack',
  DEPOSIT_STRIPE = 'deposit.stripe',
  INTERNAL_TRANSFER = 'internal.transfer',
  EXTERNAL_TRANSFER_PAYSTACK = 'external.transfer.paystack'
}

export const transactionLimit: { [key in KycLevel]: number } = {
  level_0: 0,
  level_1: 300000,
  level_2: 15000000,
  level_3: Infinity
};

export type TransactionDepositData = {
  reference: string;
  status: string;
  amount: number;
};

export type ExternalBankUserDetail = {
  name: string;
  bank: string;
  accountNumber?: string;
};

export type InternalTransferData = {
  senderAccountId: string;
  amount: number;
  receiverAccountNumber: string;
};

export type TransferSessionData = {
  provider: string;
  id: string;
};
