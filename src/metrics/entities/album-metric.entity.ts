import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('album_metrics')
export class AlbumMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  albumId: string;

  @Column({ default: 0 })
  likes: number;

  @Column({ default: 0 })
  shares: number;

  @CreateDateColumn()
  timestamp: Date;
}
