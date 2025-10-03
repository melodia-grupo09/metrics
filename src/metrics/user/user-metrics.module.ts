import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserMetricsController } from './user-metrics.controller';
import { UserMetricsService } from './user-metrics.service';
import { UserMetricsConsumer } from './user-metrics.consumer';
import { UserMetric, UserMetricSchema } from '../entities/user-metric.entity';
import { RabbitModule } from '../../rabbit/rabbit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserMetric.name, schema: UserMetricSchema },
    ]),
    RabbitModule,
  ],
  controllers: [UserMetricsController],
  providers: [UserMetricsService, UserMetricsConsumer],
  exports: [UserMetricsService],
})
export class UserMetricsModule {}
