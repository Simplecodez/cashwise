import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  Unique
} from 'typeorm';
import { KycDocumentType, KycStatus } from '../enum/kyc.enum';
import { Kyc } from './kyc.entity';

@Entity()
@Unique('unique_idx_kyc_id_document_type', ['kycId', 'documentType'])
export class KycDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Kyc, (kyc) => kyc.documents)
  kyc: Kyc;

  @Column({ type: 'uuid' })
  kycId: string;

  @Column({ type: 'varchar' })
  documentType: KycDocumentType;

  @Column({ type: 'varchar', length: 255, select: false })
  documentUrl: string;

  @Column({ type: 'varchar', length: 20, default: KycStatus.PENDING })
  status: KycStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @CreateDateColumn()
  submittedAt: Date;
}
