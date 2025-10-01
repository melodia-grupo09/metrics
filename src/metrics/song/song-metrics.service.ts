import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { SongMetric } from '../entities/song-metric.entity';

@Injectable()
export class SongMetricsService {
  constructor(
    @InjectModel(SongMetric.name)
    private songMetricModel: Model<SongMetric>,
    @Inject('METRICS_SERVICE') private readonly rabbitClient: ClientProxy,
  ) {}

  private async songExists(songId: string): Promise<boolean> {
    const metric = await this.songMetricModel.findOne({ songId }).exec();
    return metric !== null;
  }

  async createSong(songId: string) {
    const existingMetric = await this.songMetricModel
      .findOne({ songId })
      .exec();

    if (existingMetric) {
      throw new BadRequestException('Song already exists');
    }

    const songMetric = new this.songMetricModel({
      songId,
      plays: 0,
      likes: 0,
      shares: 0,
    });

    await songMetric.save();

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
    this.rabbitClient.emit('metrics.song.play', data);

    return { message: 'Song play recorded' };
  }

  async incrementSongLikes(songId: string) {
    const exists = await this.songExists(songId);
    if (!exists) {
      throw new NotFoundException('Song not found');
    }

    const data = { songId, metricType: 'like', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song.like', data);

    return { message: 'Song like recorded' };
  }

  async incrementSongShares(songId: string) {
    const exists = await this.songExists(songId);
    if (!exists) {
      throw new NotFoundException('Song not found');
    }

    const data = { songId, metricType: 'share', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song.share', data);

    return { message: 'Song share recorded' };
  }

  async getSongMetrics(songId: string) {
    const metrics = await this.songMetricModel.findOne({ songId }).exec();

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
