import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArtistMetricsController } from './artist-metrics.controller';
import { ArtistMetricsService } from './artist-metrics.service';
import { ArtistMetricsConsumer } from './artist-metrics.consumer';
import {
  ArtistMetric,
  ArtistMetricSchema,
} from '../entities/artist-metric.entity';
import { UserPlay, UserPlaySchema } from '../entities/user-play.entity';
import { UserLike, UserLikeSchema } from '../entities/user-like.entity';
import { UserShare, UserShareSchema } from '../entities/user-share.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ArtistMetric.name, schema: ArtistMetricSchema },
      { name: UserPlay.name, schema: UserPlaySchema },
      { name: UserLike.name, schema: UserLikeSchema },
      { name: UserShare.name, schema: UserShareSchema },
    ]),
  ],
  controllers: [ArtistMetricsController],
  providers: [ArtistMetricsService, ArtistMetricsConsumer],
  exports: [ArtistMetricsService],
})
export class ArtistMetricsModule {}
