import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { SongAlbumDto } from './dto/song-album.dto';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // Song endpoints
  @ApiOperation({ summary: 'Increment song plays' })
  @ApiParam({ name: 'songId', description: 'Song ID' })
  @ApiResponse({
    status: 200,
    description: 'Song play recorded successfully',
  })
  @Post('songs/:songId/plays')
  incrementSongPlays(@Param('songId') songId: string) {
    return this.metricsService.incrementSongPlays(songId);
  }

  @ApiOperation({ summary: 'Increment song likes' })
  @ApiParam({ name: 'songId', description: 'Song ID' })
  @ApiResponse({ status: 200, description: 'Song like recorded successfully' })
  @Post('songs/:songId/likes')
  incrementSongLikes(@Param('songId') songId: string) {
    return this.metricsService.incrementSongLikes(songId);
  }

  @ApiOperation({ summary: 'Increment song shares' })
  @ApiParam({ name: 'songId', description: 'Song ID' })
  @ApiResponse({
    status: 200,
    description: 'Song share recorded successfully',
  })
  @Post('songs/:songId/shares')
  incrementSongShares(@Param('songId') songId: string) {
    return this.metricsService.incrementSongShares(songId);
  }

  @ApiOperation({ summary: 'Get song metrics' })
  @ApiParam({ name: 'songId', description: 'Song ID' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @Get('songs/:songId')
  getSongMetrics(@Param('songId') songId: string) {
    return this.metricsService.getSongMetrics(songId);
  }

  // Album endpoints
  @ApiOperation({ summary: 'Increment album likes' })
  @ApiParam({ name: 'albumId', description: 'Album ID' })
  @ApiResponse({ status: 200, description: 'Album like recorded successfully' })
  @Post('albums/:albumId/likes')
  incrementAlbumLikes(@Param('albumId') albumId: string) {
    return this.metricsService.incrementAlbumLikes(albumId);
  }

  @ApiOperation({ summary: 'Increment album shares' })
  @ApiParam({ name: 'albumId', description: 'Album ID' })
  @ApiResponse({
    status: 200,
    description: 'Album share recorded successfully',
  })
  @Post('albums/:albumId/shares')
  incrementAlbumShares(@Param('albumId') albumId: string) {
    return this.metricsService.incrementAlbumShares(albumId);
  }

  @ApiOperation({ summary: 'Get album metrics' })
  @ApiParam({ name: 'albumId', description: 'Album ID' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @Get('albums/:albumId')
  getAlbumMetrics(@Param('albumId') albumId: string) {
    return this.metricsService.getAlbumMetrics(albumId);
  }

  // Song-Album relation endpoints
  @ApiOperation({ summary: 'Add song to album' })
  @ApiBody({ type: SongAlbumDto })
  @ApiResponse({
    status: 200,
    description: 'Song added to album successfully',
  })
  @Post('relations/song-album')
  addSongToAlbum(@Body() songAlbumDto: SongAlbumDto) {
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
  @Delete('relations/song-album')
  removeSongFromAlbum(@Body() songAlbumDto: SongAlbumDto) {
    return this.metricsService.removeSongFromAlbum(
      songAlbumDto.songId,
      songAlbumDto.albumId,
    );
  }
}
