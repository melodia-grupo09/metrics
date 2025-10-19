import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArtistMetricsController } from './artist-metrics.controller';
import { ArtistMetricsService } from './artist-metrics.service';
import { ArtistMetricsConsumer } from './artist-metrics.consumer';
import {
  ArtistMetric,
  ArtistMetricSchema,
} from '../entities/artist-metric.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ArtistMetric.name, schema: ArtistMetricSchema },
    ]),
  ],
  controllers: [ArtistMetricsController],
  providers: [ArtistMetricsService, ArtistMetricsConsumer],
  exports: [ArtistMetricsService],
})
export class ArtistMetricsModule {}
