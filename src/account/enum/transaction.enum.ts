import { KycLevel } from '../../user/enum/kyc.enum';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  TRANSFER = 'TRANSFER',
  REFUND = 'REFUND'
}

export enum TransactionFlag {
  NORMAL = 'NORMAL',
  LARGE_AMOUNT = 'LARGE_AMOUNT',
  UNUSUAL_PATTERN = 'UNUSUAL_PATTERN',
  FREQUENT_TRANSACTIONS = 'FREQUENT_TRANSACTIONS',
  NEW_BENEFICIARY = 'NEW_BENEFICIARY'
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
  level_1: 5_000_000,
  level_2: 15_000_000,
  level_3: 100_000_000
};

export type ReceiverData = {
  receiverName: string;
  accountNumber: string;
  accountId?: string;
  bankCode?: string;
};

export type TransferData = {
  senderId: string;
  senderAccountId: string;
  receiverDetails: ReceiverData;
  amountInLowerUnit: number;
  transactionJobType: TransactionJobType;
  transactionFlag: TransactionFlag;
  transactionStatus: TransactionStatus;
  remark: string;
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
  remark?: string;
};

export type TransferSessionData = {
  provider: string;
  id: string;
};
