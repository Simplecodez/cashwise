import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { Account } from './account.entity';

@Entity()
export class Beneficiary extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Index('IDX_account_id')
  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, (account) => account.beneficiaries)
  account: Account;

  @Column({ type: 'varchar' })
  beneficiaryAccountNumber: string;

  @Column({ type: 'varchar' })
  beneficiaryName: string;
}
