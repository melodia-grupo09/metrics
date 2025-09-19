import { ApiProperty } from '@nestjs/swagger';

export class SongAlbumDto {
  @ApiProperty({
    description: 'Song ID',
    example: 'song123',
  })
  songId: string;

  @ApiProperty({
    description: 'Album ID',
    example: 'album456',
  })
  albumId: string;
}
