import * as bcrypt from 'bcrypt';
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { AccountStatus, AccountType } from '../enum/account.enum';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { Transaction } from './transaction.entity';
import { Beneficiary } from './beneficiary.entity';

@Entity()
@Index('account_number_uniq_Idx', ['accountNumber'], { unique: true })
export class Account extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @ManyToOne(() => User, (user) => user.accounts)
  user: User;

  @Column({ type: 'varchar' })
  username: string;

  @Column({ type: 'varchar', length: 13 })
  accountNumber: string;

  @Column({ type: 'bigint', default: 0 })
  balance: number;

  @Column({ type: 'varchar', length: 150, default: AccountType.SAVINGS })
  type: AccountType;

  @Column({ type: 'varchar', length: 50, default: AccountStatus.ACTIVE })
  status: AccountStatus;

  @OneToMany(() => Transaction, (tx) => tx.senderAccount)
  sentTransactions: Transaction[];

  @Column({ type: 'varchar', select: false })
  passcode: string;

  @Column({ type: 'varchar', select: false })
  passPhrase: string;

  @OneToMany(() => Transaction, (tx) => tx.receiverAccount)
  receivedTransactions: Transaction[];

  @OneToMany(() => Beneficiary, (beneficiary) => beneficiary.account)
  beneficiaries: Beneficiary[];

  @BeforeInsert()
  async hashpassword() {
    const [hashedPasscode, hashedPassPhrase] = await Promise.all([
      bcrypt.hash(this.passcode, 10),
      bcrypt.hash(this.passPhrase, 10)
    ]);
    this.passcode = hashedPasscode;
    this.passPhrase = hashedPassPhrase;
  }
}
