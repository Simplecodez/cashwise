import { BaseEntity, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class AbstractEntity extends BaseEntity {
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    precision: 3
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
    precision: 3
  })
  updatedAt: Date;
}
