import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RabbitModule } from './rabbit/rabbit.module';
import { MetricsModule } from './metrics/metrics.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [RabbitModule, MetricsModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
