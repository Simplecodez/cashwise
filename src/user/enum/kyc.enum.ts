export enum KycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum KycLevel {
  LEVEL_0 = 'level_0',
  LEVEL_1 = 'level_1',
  LEVEL_2 = 'level_2',
  LEVEL_3 = 'level_3'
}

export enum KycDocumentType {
  NIN = 'nin',
  PROOF_OF_ADDRESS = 'proof_of_address'
}

export enum KycJobType {
  BVN_VERIFICATION = 'bvn_verification',
  NIN_VERIFICATION = 'nin_verification',
  ADDRESS_VERIFICATION = 'address_verification'
}
