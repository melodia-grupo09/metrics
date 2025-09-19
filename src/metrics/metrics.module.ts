import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsConsumer } from './metrics.consumer';
import { SongMetric } from './entities/song-metric.entity';
import { AlbumMetric } from './entities/album-metric.entity';
import { SongAlbum } from './entities/song-album.entity';
import { RabbitModule } from '../rabbit/rabbit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SongMetric, AlbumMetric, SongAlbum]),
    RabbitModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsConsumer],
})
export class MetricsModule {}
