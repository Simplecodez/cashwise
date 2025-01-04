import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  DeleteDateColumn
} from 'typeorm';
import { KycDocument } from './kyc-document.entity';
import { AbstractEntity } from '../../../common/entities/abstract.entity';
import { KycLevel, KycStatus } from '../../enum/kyc.enum';

@Entity()
export class Kyc extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', default: KycLevel.LEVEL_0 })
  kycLevel: KycLevel;

  @Column({ type: 'varchar' })
  bvn: string;

  @Column({ type: 'varchar', length: 20, default: KycStatus.PENDING })
  status: KycStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'timestamp', nullable: true })
  levelOneVerifiedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  levelTwoVerifiedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  levelThreeVerifiedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;

  @OneToMany(() => KycDocument, (kycDocument) => kycDocument.kyc)
  documents: KycDocument[];
}
