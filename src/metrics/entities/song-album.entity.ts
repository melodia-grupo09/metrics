import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('song_albums')
export class SongAlbum {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  songId: string;

  @Column({ type: 'uuid' })
  albumId: string;
}
