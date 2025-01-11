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
  IN_PROGRESS = 'in_progress'
}

export enum TransactionOrigin {
  INTERNAL = 'internal',
  EXTERNAL = 'external'
}

export type ExternalBankUserDetail = {
  name: string;
  bank: string;
};
