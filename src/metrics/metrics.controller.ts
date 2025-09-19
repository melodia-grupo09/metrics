import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

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
}
