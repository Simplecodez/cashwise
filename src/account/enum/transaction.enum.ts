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
  NONE = ''
}

export type ExternalBankUserDetail = {
  name: string;
  bank: string;
};
