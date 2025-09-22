import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('user_metrics')
export class UserMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column()
  email: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  registrationDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}
