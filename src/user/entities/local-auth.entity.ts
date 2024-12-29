import * as bcrypt from 'bcrypt';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { User } from './user.entity';
import { AbstractEntity } from '../../common/entities/abstract.entity';

@Entity()
export class LocalAuth extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  userId: string;

  @OneToOne(() => User, (user) => user.local_auth)
  user: User;

  @Column()
  passwordHash: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashpassword() {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
}
