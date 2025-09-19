import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { SongAlbumDto } from './dto/song-album.dto';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // Song endpoints
  @Post('songs/:songId/plays')
  incrementSongPlays(@Param('songId') songId: string) {
    return this.metricsService.incrementSongPlays(songId);
  }

  @Post('songs/:songId/likes')
  incrementSongLikes(@Param('songId') songId: string) {
    return this.metricsService.incrementSongLikes(songId);
  }

  @Post('songs/:songId/shares')
  incrementSongShares(@Param('songId') songId: string) {
    return this.metricsService.incrementSongShares(songId);
  }

  @Get('songs/:songId')
  getSongMetrics(@Param('songId') songId: string) {
    return this.metricsService.getSongMetrics(songId);
  }

  // Album endpoints
  @Post('albums/:albumId/likes')
  incrementAlbumLikes(@Param('albumId') albumId: string) {
    return this.metricsService.incrementAlbumLikes(albumId);
  }

  @Post('albums/:albumId/shares')
  incrementAlbumShares(@Param('albumId') albumId: string) {
    return this.metricsService.incrementAlbumShares(albumId);
  }

  @Get('albums/:albumId')
  getAlbumMetrics(@Param('albumId') albumId: string) {
    return this.metricsService.getAlbumMetrics(albumId);
  }

  // Song-Album relation endpoints
  @Post('relations/song-album')
  addSongToAlbum(@Body() songAlbumDto: SongAlbumDto) {
    return this.metricsService.addSongToAlbum(
      songAlbumDto.songId,
      songAlbumDto.albumId,
    );
  }

  @Delete('relations/song-album')
  removeSongFromAlbum(@Body() songAlbumDto: SongAlbumDto) {
    return this.metricsService.removeSongFromAlbum(
      songAlbumDto.songId,
      songAlbumDto.albumId,
    );
  }
}
