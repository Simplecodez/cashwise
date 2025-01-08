import { KycLevel } from '../enum/kyc.enum';

export interface IKycCreate {
  userId: string;
  bvn: string;
}

export interface IKycUpdate {
  kycId?: string;
  bvn?: string;
  nin?: string;
  userId: string;
  phoneNumber?: string;
  documentUrlId?: string;
  level?: KycLevel;
}
