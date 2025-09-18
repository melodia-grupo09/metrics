import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { SongMetricDto } from './dto/song-metric.dto';

@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Post('song')
  recordSongMetric(@Body() data: SongMetricDto) {
    return this.metricsService.recordSongMetric(data);
  }

  @Get('song/:id')
  async getSongMetrics(@Param('id') songId: string) {
    return await this.metricsService.getSongMetrics(songId);
  }
}
