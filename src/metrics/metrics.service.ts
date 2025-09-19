import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { SongMetric } from './entities/song-metric.entity';

@Injectable()
export class MetricsService {
  constructor(
    @Inject('METRICS_SERVICE') private readonly rabbitClient: ClientProxy,
    @InjectRepository(SongMetric)
    private songMetricRepository: Repository<SongMetric>,
  ) {}

  incrementSongPlays(songId: string) {
    const data = { songId, metricType: 'play', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song', data);

    return { success: true, message: 'Song play recorded' };
  }

  incrementSongLikes(songId: string) {
    const data = { songId, metricType: 'like', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song', data);

    return { success: true, message: 'Song like recorded' };
  }

  incrementSongShares(songId: string) {
    const data = { songId, metricType: 'share', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song', data);

    return { success: true, message: 'Song share recorded' };
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
