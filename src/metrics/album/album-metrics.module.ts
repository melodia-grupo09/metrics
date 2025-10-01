import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumMetricsController } from './album-metrics.controller';
import { AlbumMetricsService } from './album-metrics.service';
import {
  AlbumMetric,
  AlbumMetricSchema,
} from '../entities/album-metric.entity';
import { SongMetric, SongMetricSchema } from '../entities/song-metric.entity';
import { RabbitModule } from '../../rabbit/rabbit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AlbumMetric.name, schema: AlbumMetricSchema },
      { name: SongMetric.name, schema: SongMetricSchema },
    ]),
    RabbitModule,
  ],
  controllers: [AlbumMetricsController],
  providers: [AlbumMetricsService],
  exports: [AlbumMetricsService],
})
export class AlbumMetricsModule {}
