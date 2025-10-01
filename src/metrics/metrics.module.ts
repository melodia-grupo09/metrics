import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsConsumer } from './metrics.consumer';
import { UserMetricsModule } from './user/user-metrics.module';
import { SongMetricsModule } from './song/song-metrics.module';
import { AlbumMetricsModule } from './album/album-metrics.module';
import { RabbitModule } from '../rabbit/rabbit.module';

@Module({
  imports: [
    RabbitModule,
    UserMetricsModule,
    SongMetricsModule,
    AlbumMetricsModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsConsumer],
})
export class MetricsModule {}
