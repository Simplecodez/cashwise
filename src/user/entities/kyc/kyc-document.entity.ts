import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  Unique
} from 'typeorm';
import { Kyc } from './kyc.entity';
import { KycDocumentType } from '../../enum/kyc.enum';

@Entity()
@Unique('unique_idx_kyc_id_document_type', ['kycId', 'documentType'])
export class KycDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Kyc, (kyc) => kyc.documents)
  kyc: Kyc;

  @Column({ type: 'uuid' })
  kycId: string;

  @Column({ type: 'varchar' })
  documentType: KycDocumentType;

  @Column({ type: 'varchar', length: 255, select: false })
  documentUrlId: string;

  @CreateDateColumn()
  submittedAt: Date;
}
