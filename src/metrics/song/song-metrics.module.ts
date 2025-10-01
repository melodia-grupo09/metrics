import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SongMetricsController } from './song-metrics.controller';
import { SongMetricsService } from './song-metrics.service';
import { SongMetric } from '../entities/song-metric.entity';
import { RabbitModule } from '../../rabbit/rabbit.module';

@Module({
  imports: [TypeOrmModule.forFeature([SongMetric]), RabbitModule],
  controllers: [SongMetricsController],
  providers: [SongMetricsService],
  exports: [SongMetricsService, TypeOrmModule], // Export TypeOrmModule so parent module can inject repositories
})
export class SongMetricsModule {}
