export type BvnVerificationResult = {
  isVerified: boolean;
  rejectionReason?: string;
};

export type BvnRecord = {
  bvn: string;
  firstName: string;
  lastName: string;
  dob: string;
  phoneNumber: string;
};

export interface IBvnService {
  verifyBvn(bvn: string, userId: string): Promise<BvnVerificationResult>;
}
