import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { SongMetric } from './entities/song-metric.entity';
import { RabbitModule } from '../rabbit/rabbit.module';

@Module({
  imports: [TypeOrmModule.forFeature([SongMetric]), RabbitModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
