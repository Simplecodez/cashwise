import {
  AfterLoad,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import {
  ExternalBankUserDetail,
  TransactionGateway,
  TransactionOrigin,
  TransactionStatus,
  TransactionType,
  TransferSessionData
} from '../enum/transaction.enum';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { Account } from './account.entity';

@Entity()
export class Transaction extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_sender_account_id')
  @Column({ type: 'uuid', nullable: true })
  senderAccountId: string;

  @ManyToOne(() => Account, (account) => account.sentTransactions, { nullable: true })
  senderAccount: Account;

  @Index('IDX_receiver_account_id')
  @Column({ type: 'uuid', nullable: true })
  receiverAccountId: string;

  @ManyToOne(() => Account, (account) => account.receivedTransactions, { nullable: true })
  receiverAccount: Account;

  @Column({ type: 'jsonb', nullable: true })
  externalSenderDetails: ExternalBankUserDetail;

  @Column({ type: 'jsonb', nullable: true })
  externalReceiverDetails: ExternalBankUserDetail;

  @Column({ type: 'jsonb', nullable: true })
  session: TransferSessionData;

  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'varchar', length: 50 })
  type: TransactionType;

  @Index('IDX_transaction_status')
  @Column({ type: 'varchar' })
  status: TransactionStatus;

  @Column({ type: 'varchar' })
  origin: TransactionOrigin;

  @Column({ type: 'varchar', nullable: true, select: false })
  accessCode: string;

  @Column({ type: 'varchar', select: false })
  gateway: TransactionGateway;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureReason: string;

  amountInNaira: string;

  @AfterLoad()
  convertToNaira() {
    this.amountInNaira = (this.amount / 100).toFixed(2);
  }
}
