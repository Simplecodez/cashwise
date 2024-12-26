import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Gender, UserStatus } from '../enum/user.enum';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { LocalAuth } from './local-auth.entity';

@Entity()
export class User extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  firstName: string;

  @Column({ type: 'varchar', length: 255 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ unique: true, type: 'varchar', length: 15 })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 7 })
  countryCode: string;

  @Column({ type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'enum', enum: Gender })
  gender: string;

  @Column({ type: 'varchar', length: 300 })
  address: string;

  @Column({ type: 'varchar', length: 50 })
  nationality: string;

  @Column({ type: 'varchar', length: 50 })
  countryOfResidence: string;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.INACTIVE })
  status: string;

  @OneToOne(() => LocalAuth, (localAuth) => localAuth.user)
  local_auth: LocalAuth;
}
