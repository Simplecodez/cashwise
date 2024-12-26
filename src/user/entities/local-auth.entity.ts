import * as bcryptjs from 'bcrypt';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class LocalAuth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  userId: string;

  @OneToOne(() => User, (user) => user.local_auth)
  user: User;

  @Column()
  passwordHash: string;

  @CreateDateColumn({ select: false })
  createdAt: Date;

  @UpdateDateColumn({ select: false })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashpassword() {
    this.passwordHash = await bcryptjs.hash(this.passwordHash, 10);
  }
}
