import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SongAlbumDto {
  @ApiProperty({
    description: 'Song ID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsUUID(4, { message: 'songId must be a valid UUID' })
  songId: string;

  @ApiProperty({
    description: 'Album ID',
    example: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    format: 'uuid',
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsUUID(4, { message: 'albumId must be a valid UUID' })
  albumId: string;
}
