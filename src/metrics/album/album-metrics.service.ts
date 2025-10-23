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
import { AlbumMetric } from '../entities/album-metric.entity';
import { SongMetric } from '../entities/song-metric.entity';

@Injectable()
export class AlbumMetricsService implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(AlbumMetricsService.name);

  constructor(
    @InjectModel(AlbumMetric.name)
    private albumMetricModel: Model<AlbumMetric>,
    @InjectModel(SongMetric.name)
    private songMetricModel: Model<SongMetric>,
  ) {
    const rabbitUrl =
      process.env.CLOUDAMQP_URL ||
      process.env.RABBITMQ_URL ||
      'amqp://localhost:5672';
    const connection = amqp.connect([rabbitUrl]);
    this.channelWrapper = connection.createChannel();
  }

  async onModuleInit() {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.assertExchange('metrics_exchange', 'topic', {
        durable: true,
      });
    });
  }

  async createAlbum(albumId: string) {
    const existingMetric = await this.albumMetricModel
      .findOne({ albumId })
      .exec();

    if (existingMetric) {
      throw new BadRequestException('Album already exists');
    }

    const albumMetric = new this.albumMetricModel({
      albumId,
      likes: 0,
      shares: 0,
    });

    await albumMetric.save();

    return {
      message: 'Album created successfully',
      albumId,
    };
  }

  async incrementAlbumLikes(albumId: string) {
    const exists = await this.albumExists(albumId);
    if (!exists) {
      throw new NotFoundException('Album not found');
    }

    const data = { albumId, metricType: 'like', timestamp: new Date() };

    await this.channelWrapper.publish(
      'metrics_exchange',
      'metrics.album.like',
      Buffer.from(JSON.stringify(data)),
    );

    return { message: 'Album like recorded' };
  }

  async incrementAlbumShares(albumId: string) {
    const exists = await this.albumExists(albumId);
    if (!exists) {
      throw new NotFoundException('Album not found');
    }

    const data = { albumId, metricType: 'share', timestamp: new Date() };

    await this.channelWrapper.publish(
      'metrics_exchange',
      'metrics.album.share',
      Buffer.from(JSON.stringify(data)),
    );

    return { message: 'Album share recorded' };
  }

  private async albumExists(albumId: string): Promise<boolean> {
    const metric = await this.albumMetricModel.findOne({ albumId }).exec();
    return metric !== null;
  }

  async getAlbumMetrics(albumId: string, songIds?: string[]) {
    const albumMetrics = await this.albumMetricModel
      .findOne({ albumId })
      .exec();

    if (!albumMetrics) {
      throw new NotFoundException('Album not found');
    }

    let totalPlays = 0;
    if (songIds && songIds.length > 0) {
      const songs = await this.songMetricModel
        .find({ songId: { $in: songIds } })
        .exec();

      totalPlays = songs.reduce((sum, song) => sum + song.plays, 0);
    }

    return {
      albumId: albumMetrics.albumId,
      plays: totalPlays, // Calculated from songs
      likes: albumMetrics.likes,
      shares: albumMetrics.shares,
    };
  }

  async getTopAlbums(limit: number = 10) {
    const topAlbums = await this.albumMetricModel
      .find({})
      .sort({ likes: -1 })
      .limit(limit)
      .exec();

    return topAlbums.map((album) => ({
      albumId: album.albumId,
      likes: album.likes,
      shares: album.shares,
    }));
  }
}
