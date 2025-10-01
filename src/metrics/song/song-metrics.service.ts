import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { SongMetric } from '../entities/song-metric.entity';

@Injectable()
export class SongMetricsService implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(SongMetricsService.name);

  constructor(
    @InjectModel(SongMetric.name)
    private songMetricModel: Model<SongMetric>,
  ) {
    const connection = amqp.connect(['amqp://localhost:5672']);
    this.channelWrapper = connection.createChannel();
  }

  async onModuleInit() {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.assertExchange('metrics_exchange', 'topic', {
        durable: true,
      });
    });
  }

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

    await this.channelWrapper.publish(
      'metrics_exchange',
      'metrics.song.play',
      Buffer.from(JSON.stringify(data)),
    );

    return { message: 'Song play recorded' };
  }

  async incrementSongLikes(songId: string) {
    const exists = await this.songExists(songId);
    if (!exists) {
      throw new NotFoundException('Song not found');
    }

    const data = { songId, metricType: 'like', timestamp: new Date() };

    await this.channelWrapper.publish(
      'metrics_exchange',
      'metrics.song.like',
      Buffer.from(JSON.stringify(data)),
    );

    return { message: 'Song like recorded' };
  }

  async incrementSongShares(songId: string) {
    const exists = await this.songExists(songId);
    if (!exists) {
      throw new NotFoundException('Song not found');
    }

    const data = { songId, metricType: 'share', timestamp: new Date() };

    await this.channelWrapper.publish(
      'metrics_exchange',
      'metrics.song.share',
      Buffer.from(JSON.stringify(data)),
    );

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
