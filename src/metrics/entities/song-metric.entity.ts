import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('song_metrics')
export class SongMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  songId: string;

  @Column({ default: 0 })
  plays: number;

  @Column({ default: 0 })
  likes: number;

  @Column({ default: 0 })
  shares: number;

  @CreateDateColumn()
  timestamp: Date;
}
