import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { SongMetricDto } from './dto/song-metric.dto';
import { SongMetric } from './entities/song-metric.entity';

@Injectable()
export class MetricsService {
  constructor(
    @Inject('METRICS_SERVICE') private readonly client: ClientProxy,
    @InjectRepository(SongMetric)
    private songMetricRepository: Repository<SongMetric>,
  ) {}

  recordSongMetric(data: SongMetricDto) {
    data.timestamp = new Date();

    // Publish to RabbitMQ
    this.client.emit('metrics.song', data);

    return { success: true, message: 'Song metric recorded' };
  }

  async getSongMetrics(songId: string) {
    const metrics = await this.songMetricRepository.findOne({
      where: { songId },
    });

    if (!metrics) {
      return {
        songId,
        plays: 0,
        likes: 0,
        shares: 0,
      };
    }

    return {
      songId: metrics.songId,
      plays: metrics.plays,
      likes: metrics.likes,
      shares: metrics.shares,
    };
  }
}
