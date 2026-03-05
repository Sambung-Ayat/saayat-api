import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('verification')
export class Verification {
  @PrimaryColumn('uuid')
  id: string;

  @Column('text')
  identifier: string;

  @Column('text')
  value: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamp', nullable: true })
  createdAt: Date | null;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt: Date | null;
}
