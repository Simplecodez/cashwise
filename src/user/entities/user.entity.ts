import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Gender, Role, UserStatus } from '../enum/user.enum';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { LocalAuth } from './local-auth.entity';
import { v4 as uuidv4 } from 'uuid';
import { KycLevel } from '../enum/kyc.enum';

@Entity()
export class User extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  firstName: string;

  @Column({ type: 'varchar', length: 255 })
  lastName: string;

  @Column({ type: 'varchar', length: 20 })
  username: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 15, select: false, unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 7, select: false })
  countryCode: string;

  @Column({ type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column({ type: 'enum', enum: Role, default: Role.USER, select: false })
  role: Role;

  @Column({ type: 'varchar', length: 300, select: false })
  address: string;

  @Column({ type: 'varchar', length: 50, select: false })
  nationality: string;

  @Column({ type: 'varchar', length: 50, select: false })
  countryOfResidence: string;

  @Column({ nullable: true, type: 'timestamp', select: false })
  emailVerifiedAt: Date;

  @Column({ nullable: true, type: 'timestamp', select: false })
  phoneNumberVerifiedAt: Date;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.INACTIVE, select: false })
  status: UserStatus;

  @Column({ type: 'varchar', default: KycLevel.LEVEL_0 })
  approvedKycLevel: KycLevel;

  @OneToOne(() => LocalAuth, (localAuth) => localAuth.user)
  local_auth: LocalAuth;

  @Column({ type: 'uuid', default: uuidv4(), select: false })
  tokenVersion: string;
}
