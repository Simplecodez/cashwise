import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { User } from '../../user/entities/user.entity';
import { ActivityType } from '../enum/activity.enum';

@Entity()
export class Activity extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.activities)
  user: User;

  @Column({ type: 'varchar' })
  type: ActivityType;

  @Column({ type: 'text' })
  description: string;
}
