import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumMetricsController } from './album-metrics.controller';
import { AlbumMetricsService } from './album-metrics.service';
import { AlbumMetricsConsumer } from './album-metrics.consumer';
import {
  AlbumMetric,
  AlbumMetricSchema,
} from '../entities/album-metric.entity';
import { SongMetric, SongMetricSchema } from '../entities/song-metric.entity';
import { UserLike, UserLikeSchema } from '../entities/user-like.entity';
import { UserShare, UserShareSchema } from '../entities/user-share.entity';
import { RabbitModule } from '../../rabbit/rabbit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AlbumMetric.name, schema: AlbumMetricSchema },
      { name: SongMetric.name, schema: SongMetricSchema },
      { name: UserLike.name, schema: UserLikeSchema },
      { name: UserShare.name, schema: UserShareSchema },
    ]),
    RabbitModule,
  ],
  controllers: [AlbumMetricsController],
  providers: [AlbumMetricsService, AlbumMetricsConsumer],
  exports: [AlbumMetricsService],
})
export class AlbumMetricsModule {}
