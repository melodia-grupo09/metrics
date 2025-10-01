import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum UserEventType {
  REGISTRATION = 'registration',
  LOGIN = 'login',
  ACTIVITY = 'activity',
}

@Entity('user_events')
@Index(['userId', 'eventType', 'timestamp'])
@Index(['eventType', 'timestamp'])
export class UserMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: UserEventType,
  })
  eventType: UserEventType;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // For region, device, etc.

  @CreateDateColumn()
  createdAt: Date;
}
