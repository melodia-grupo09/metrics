import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SongInteractionDto {
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

  @ApiProperty({
    description: 'Region of the user',
    example: 'Argentina',
    required: false,
  })
  @IsString()
  @IsOptional()
  region?: string;
}
