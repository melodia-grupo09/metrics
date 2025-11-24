import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AlbumInteractionDto {
  @ApiProperty({
    description: 'ID of the artist',
    example: 'artist-123',
  })
  @IsString()
  @IsNotEmpty()
  artistId: string;

  @ApiProperty({
    description: 'ID of the user',
    example: 'user-456',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
