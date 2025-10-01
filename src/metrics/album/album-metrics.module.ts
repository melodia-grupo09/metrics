import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlbumMetricsController } from './album-metrics.controller';
import { AlbumMetricsService } from './album-metrics.service';
import { AlbumMetric } from '../entities/album-metric.entity';
import { SongAlbum } from '../entities/song-album.entity';
import { RabbitModule } from '../../rabbit/rabbit.module';

@Module({
  imports: [TypeOrmModule.forFeature([AlbumMetric, SongAlbum]), RabbitModule],
  controllers: [AlbumMetricsController],
  providers: [AlbumMetricsService],
  exports: [AlbumMetricsService, TypeOrmModule],
})
export class AlbumMetricsModule {}
