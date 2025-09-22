import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { SongMetric } from '../entities/song-metric.entity';

@Injectable()
export class SongMetricsService {
  constructor(
    @InjectRepository(SongMetric)
    private songMetricRepository: Repository<SongMetric>,
    @Inject('METRICS_SERVICE') private readonly rabbitClient: ClientProxy,
  ) {}

  private async songExists(songId: string): Promise<boolean> {
    const metric = await this.songMetricRepository.findOne({
      where: { songId },
    });

    return metric !== null;
  }

  async createSong(songId: string) {
    const existingMetric = await this.songMetricRepository.findOne({
      where: { songId },
    });

    if (existingMetric) {
      throw new BadRequestException('Song already exists');
    }

    const songMetric = new SongMetric();
    songMetric.songId = songId;
    songMetric.plays = 0;
    songMetric.likes = 0;
    songMetric.shares = 0;

    await this.songMetricRepository.save(songMetric);

    return {
      message: 'Song created successfully',
      songId,
    };
  }

  async incrementSongPlays(songId: string) {
    const exists = await this.songExists(songId);
    if (!exists) {
      throw new NotFoundException('Song not found');
    }

    const data = { songId, metricType: 'play', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song', data);

    return { message: 'Song play recorded' };
  }

  async incrementSongLikes(songId: string) {
    const exists = await this.songExists(songId);
    if (!exists) {
      throw new NotFoundException('Song not found');
    }

    const data = { songId, metricType: 'like', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song', data);

    return { message: 'Song like recorded' };
  }

  async incrementSongShares(songId: string) {
    const exists = await this.songExists(songId);
    if (!exists) {
      throw new NotFoundException('Song not found');
    }

    const data = { songId, metricType: 'share', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song', data);

    return { message: 'Song share recorded' };
  }

  async getSongMetrics(songId: string) {
    const metrics = await this.songMetricRepository.findOne({
      where: { songId },
    });

    if (!metrics) {
      throw new NotFoundException('Song not found');
    }

    return {
      songId: metrics.songId,
      plays: metrics.plays,
      likes: metrics.likes,
      shares: metrics.shares,
    };
  }
}
