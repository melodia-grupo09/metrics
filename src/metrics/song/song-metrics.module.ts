import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SongMetricsController } from './song-metrics.controller';
import { SongMetricsService } from './song-metrics.service';
import { SongMetricsConsumer } from './song-metrics.consumer';
import { SongMetric, SongMetricSchema } from '../entities/song-metric.entity';
import { RabbitModule } from '../../rabbit/rabbit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SongMetric.name, schema: SongMetricSchema },
    ]),
    RabbitModule,
  ],
  controllers: [SongMetricsController],
  providers: [SongMetricsService, SongMetricsConsumer],
  exports: [SongMetricsService],
})
export class SongMetricsModule {}
