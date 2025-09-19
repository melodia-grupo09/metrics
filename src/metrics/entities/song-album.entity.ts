import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('song_albums')
export class SongAlbum {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  songId: string;

  @Column()
  albumId: string;
}
