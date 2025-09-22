import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsConsumer } from './metrics.consumer';
import { AlbumMetric } from './entities/album-metric.entity';
import { SongAlbum } from './entities/song-album.entity';
import { SongMetric } from './entities/song-metric.entity';
import { UserMetric } from './user/user-metric.entity';
import { UserMetricsModule } from './user/user-metrics.module';
import { SongMetricsModule } from './song/song-metrics.module';
import { RabbitModule } from '../rabbit/rabbit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlbumMetric, SongAlbum, SongMetric, UserMetric]),
    RabbitModule,
    UserMetricsModule,
    SongMetricsModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsConsumer],
})
export class MetricsModule {}
