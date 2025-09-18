import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RabbitModule } from './rabbit/rabbit.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [RabbitModule, MetricsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
