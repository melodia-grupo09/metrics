import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { SongAlbumDto } from './dto/song-album.dto';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // Song endpoints
  @ApiOperation({ summary: 'Create a new song' })
  @ApiResponse({
    status: 201,
    description: 'Song created successfully',
  })
  @ApiResponse({ status: 400, description: 'Song already exists' })
  @Post('songs/:songId')
  async createSong(@Param('songId') songId: string) {
    return this.metricsService.createSong(songId);
  }

  @ApiOperation({ summary: 'Increment song plays' })
  @ApiResponse({
    status: 200,
    description: 'Song play recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @Post('songs/:songId/plays')
  async incrementSongPlays(@Param('songId') songId: string) {
    return this.metricsService.incrementSongPlays(songId);
  }

  @ApiOperation({ summary: 'Increment song likes' })
  @ApiResponse({ status: 200, description: 'Song like recorded successfully' })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @Post('songs/:songId/likes')
  async incrementSongLikes(@Param('songId') songId: string) {
    return this.metricsService.incrementSongLikes(songId);
  }

  @ApiOperation({ summary: 'Increment song shares' })
  @ApiResponse({
    status: 200,
    description: 'Song share recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @Post('songs/:songId/shares')
  async incrementSongShares(@Param('songId') songId: string) {
    return this.metricsService.incrementSongShares(songId);
  }

  @ApiOperation({ summary: 'Get song metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @Get('songs/:songId')
  async getSongMetrics(@Param('songId') songId: string) {
    return this.metricsService.getSongMetrics(songId);
  }

  // Album endpoints
  @ApiOperation({ summary: 'Create a new album' })
  @ApiResponse({
    status: 201,
    description: 'Album created successfully',
  })
  @ApiResponse({ status: 400, description: 'Album already exists' })
  @Post('albums/:albumId')
  async createAlbum(@Param('albumId') albumId: string) {
    return this.metricsService.createAlbum(albumId);
  }

  @ApiOperation({ summary: 'Increment album likes' })
  @ApiResponse({ status: 200, description: 'Album like recorded successfully' })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @Post('albums/:albumId/likes')
  async incrementAlbumLikes(@Param('albumId') albumId: string) {
    return this.metricsService.incrementAlbumLikes(albumId);
  }

  @ApiOperation({ summary: 'Increment album shares' })
  @ApiResponse({
    status: 200,
    description: 'Album share recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @Post('albums/:albumId/shares')
  async incrementAlbumShares(@Param('albumId') albumId: string) {
    return this.metricsService.incrementAlbumShares(albumId);
  }

  @ApiOperation({ summary: 'Get album metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @Get('albums/:albumId')
  async getAlbumMetrics(@Param('albumId') albumId: string) {
    return this.metricsService.getAlbumMetrics(albumId);
  }

  // Song-Album relation endpoints
  @ApiOperation({ summary: 'Add song to album' })
  @ApiBody({ type: SongAlbumDto })
  @ApiResponse({
    status: 200,
    description: 'Song added to album successfully',
  })
  @ApiResponse({ status: 404, description: 'Song or album not found' })
  @Post('relations/song-album')
  async addSongToAlbum(@Body() songAlbumDto: SongAlbumDto) {
    return this.metricsService.addSongToAlbum(
      songAlbumDto.songId,
      songAlbumDto.albumId,
    );
  }

  @ApiOperation({ summary: 'Remove song from album' })
  @ApiBody({ type: SongAlbumDto })
  @ApiResponse({
    status: 200,
    description: 'Song removed from album successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Song, album, or relation not found',
  })
  @Delete('relations/song-album')
  async removeSongFromAlbum(@Body() songAlbumDto: SongAlbumDto) {
    return this.metricsService.removeSongFromAlbum(
      songAlbumDto.songId,
      songAlbumDto.albumId,
    );
  }
}
