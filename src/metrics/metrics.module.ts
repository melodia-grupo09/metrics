import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { UserMetricsModule } from './user/user-metrics.module';
import { SongMetricsModule } from './song/song-metrics.module';
import { AlbumMetricsModule } from './album/album-metrics.module';
import { ArtistMetricsModule } from './artist/artist-metrics.module';
import { RabbitModule } from '../rabbit/rabbit.module';
import { AlbumMetric, AlbumMetricSchema } from './entities/album-metric.entity';
import { SongMetric, SongMetricSchema } from './entities/song-metric.entity';
import { UserMetric, UserMetricSchema } from './entities/user-metric.entity';
import {
  ArtistMetric,
  ArtistMetricSchema,
} from './entities/artist-metric.entity';
import { UserLike, UserLikeSchema } from './entities/user-like.entity';
import { UserShare, UserShareSchema } from './entities/user-share.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AlbumMetric.name, schema: AlbumMetricSchema },
      { name: SongMetric.name, schema: SongMetricSchema },
      { name: UserMetric.name, schema: UserMetricSchema },
      { name: ArtistMetric.name, schema: ArtistMetricSchema },
      { name: UserLike.name, schema: UserLikeSchema },
      { name: UserShare.name, schema: UserShareSchema },
    ]),
    RabbitModule,
    UserMetricsModule,
    SongMetricsModule,
    AlbumMetricsModule,
    ArtistMetricsModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
