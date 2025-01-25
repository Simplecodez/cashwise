import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';

@Entity()
export class ExternalRecipient extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  accountName: string;

  @Column({ type: 'varchar', length: 15 })
  accountNumber: string;

  @Column({ type: 'varchar' })
  recipientCode: string;

  @Column({ type: 'varchar' })
  bankName: string;

  @Column({ type: 'varchar' })
  bankCode: string;
}
