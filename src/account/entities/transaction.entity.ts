import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import {
  ExternalBankUserDetail,
  TransactionGateway,
  TransactionOrigin,
  TransactionStatus,
  TransactionType
} from '../enum/transaction.enum';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { Account } from './account.entity';

@Entity()
export class Transaction extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  senderAccountId: string;

  @ManyToOne(() => Account, (account) => account.sentTransactions, { nullable: true })
  senderAccount: Account;

  @Column({ type: 'uuid', nullable: true })
  receiverAccountId: string;

  @ManyToOne(() => Account, (user) => user.receivedTransactions, { nullable: true })
  receiverAccount: Account;

  @Column({ type: 'jsonb', nullable: true })
  externalSenderDetails: ExternalBankUserDetail;

  @Column({ type: 'jsonb', nullable: true })
  externalReceiverDetails: ExternalBankUserDetail;

  @Column({ type: 'varchar', length: 40, nullable: true })
  sessionId: string;

  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'varchar', length: 50 })
  type: TransactionType;

  @Column({ type: 'varchar' })
  status: TransactionStatus;

  @Column({ type: 'varchar' })
  origin: TransactionOrigin;

  @Column({ type: 'varchar', nullable: true })
  accessCode: string;

  @Column({ type: 'varchar' })
  gateway: TransactionGateway;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureReason: string;

  get amountInBaseUnit(): number {
    return this.amount / 100;
  }
}
