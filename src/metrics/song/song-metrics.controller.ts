import { Controller, Get, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { SongMetricsService } from './song-metrics.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

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
  async createSong(@Param('songId', ParseUUIDPipe) songId: string) {
    return this.songMetricsService.createSong(songId);
  }

  @ApiOperation({ summary: 'Increment song plays' })
  @ApiResponse({
    status: 200,
    description: 'Song play recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @Post(':songId/plays')
  async incrementSongPlays(@Param('songId', ParseUUIDPipe) songId: string) {
    return this.songMetricsService.incrementSongPlays(songId);
  }

  @ApiOperation({ summary: 'Increment song likes' })
  @ApiResponse({ status: 200, description: 'Song like recorded successfully' })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @Post(':songId/likes')
  async incrementSongLikes(@Param('songId', ParseUUIDPipe) songId: string) {
    return this.songMetricsService.incrementSongLikes(songId);
  }

  @ApiOperation({ summary: 'Increment song shares' })
  @ApiResponse({
    status: 200,
    description: 'Song share recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @Post(':songId/shares')
  async incrementSongShares(@Param('songId', ParseUUIDPipe) songId: string) {
    return this.songMetricsService.incrementSongShares(songId);
  }

  @ApiOperation({ summary: 'Get song metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @Get(':songId')
  async getSongMetrics(@Param('songId', ParseUUIDPipe) songId: string) {
    return this.songMetricsService.getSongMetrics(songId);
  }
}
