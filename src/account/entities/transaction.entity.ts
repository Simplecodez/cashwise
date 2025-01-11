import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import {
  ExternalBankUserDetail,
  TransactionOrigin,
  TransactionStatus,
  TransactionType
} from '../enum/transaction.enum';
import { User } from '../../user/entities/user.entity';
import { AbstractEntity } from '../../common/entities/abstract.entity';

@Entity()
export class Transaction extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  accountId: string;

  @Column({ type: 'uuid', nullable: true })
  senderId: string;

  @ManyToOne(() => User, (user) => user.sentTransactions, { nullable: true })
  sender: User;

  @Column({ type: 'uuid', nullable: true })
  recipientId: string;

  @ManyToOne(() => User, (user) => user.receivedTransactions, { nullable: true })
  recipient: User;

  @Column({ type: 'jsonb', nullable: false })
  externalSenderDetails: ExternalBankUserDetail;

  @Column({ type: 'jsonb', nullable: false })
  externalReceiverDetails: ExternalBankUserDetail;

  @Column({ type: 'varchar', length: 40 })
  sessionId: string;

  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'bigint' })
  amount: bigint;

  @Column({ type: 'varchar', length: 50 })
  type: TransactionType;

  @Column({ type: 'varchar' })
  status: TransactionStatus;

  @Column({ type: 'varchar' })
  origin: TransactionOrigin;

  @Column({ type: 'text', nullable: true })
  remark: string;
}
