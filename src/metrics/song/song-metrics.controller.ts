import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SongMetricsService } from './song-metrics.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SongPlayDto } from './dto/song-play.dto';
import { SongInteractionDto } from './dto/song-interaction.dto';

@ApiTags('song-metrics')
@Controller('metrics/songs')
export class SongMetricsController {
  constructor(private readonly songMetricsService: SongMetricsService) {}

  @ApiOperation({ summary: 'Create a new song' })
  @ApiResponse({
    status: 201,
    description: 'Song created successfully',
  })
  @ApiResponse({ status: 400, description: 'Song already exists' })
  @Post(':songId')
  async createSong(@Param('songId') songId: string) {
    return this.songMetricsService.createSong(songId);
  }

  @ApiOperation({ summary: 'Increment song plays' })
  @ApiResponse({
    status: 200,
    description: 'Song play recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @Post(':songId/plays')
  async incrementSongPlays(
    @Param('songId') songId: string,
    @Body() playDto: SongPlayDto,
  ) {
    return this.songMetricsService.incrementSongPlays(
      songId,
      playDto.artistId,
      playDto.userId,
      playDto.region,
    );
  }

  @ApiOperation({ summary: 'Increment song likes' })
  @ApiResponse({ status: 200, description: 'Song like recorded successfully' })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @Post(':songId/likes')
  async incrementSongLikes(
    @Param('songId') songId: string,
    @Body() interactionDto: SongInteractionDto,
  ) {
    return this.songMetricsService.incrementSongLikes(
      songId,
      interactionDto.artistId,
      interactionDto.userId,
      interactionDto.region,
    );
  }

  @ApiOperation({ summary: 'Increment song shares' })
  @ApiResponse({
    status: 200,
    description: 'Song share recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @Post(':songId/shares')
  async incrementSongShares(
    @Param('songId') songId: string,
    @Body() interactionDto: SongInteractionDto,
  ) {
    return this.songMetricsService.incrementSongShares(
      songId,
      interactionDto.artistId,
      interactionDto.userId,
      interactionDto.region,
    );
  }

  @ApiOperation({ summary: 'Get song metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @Get(':songId')
  async getSongMetrics(@Param('songId') songId: string) {
    return this.songMetricsService.getSongMetrics(songId);
  }

  @ApiOperation({ summary: 'Get top songs by plays' })
  @ApiResponse({
    status: 200,
    description: 'Top songs retrieved successfully',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top songs to return (default: 10)',
  })
  @Get()
  async getTopSongs(@Query('limit') limit?: number) {
    const parsedLimit = limit ? parseInt(limit.toString(), 10) : 10;
    return this.songMetricsService.getTopSongs(parsedLimit);
  }

  @ApiOperation({ summary: 'Delete a song' })
  @ApiResponse({
    status: 200,
    description: 'Song deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @ApiParam({
    name: 'songId',
    type: 'string',
    description: 'Unique identifier for the song',
    example: 'song-123',
  })
  @Delete(':songId')
  @HttpCode(HttpStatus.OK)
  async deleteSong(@Param('songId') songId: string) {
    return this.songMetricsService.deleteSong(songId);
  }
}
