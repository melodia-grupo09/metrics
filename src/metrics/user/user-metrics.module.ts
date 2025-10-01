import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMetricsController } from './user-metrics.controller';
import { UserMetricsService } from './user-metrics.service';
import { UserMetric } from '../entities/user-metric.entity';
import { RabbitModule } from '../../rabbit/rabbit.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserMetric]), RabbitModule],
  controllers: [UserMetricsController],
  providers: [UserMetricsService],
  exports: [UserMetricsService, TypeOrmModule],
})
export class UserMetricsModule {}
