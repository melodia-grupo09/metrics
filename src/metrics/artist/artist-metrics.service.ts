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
import { ArtistMetric } from '../entities/artist-metric.entity';

@Injectable()
export class ArtistMetricsService implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(ArtistMetricsService.name);

  constructor(
    @InjectModel(ArtistMetric.name)
    private artistMetricModel: Model<ArtistMetric>,
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

  private async artistExists(artistId: string): Promise<boolean> {
    const metric = await this.artistMetricModel.findOne({ artistId }).exec();
    return metric !== null;
  }

  async createArtist(artistId: string) {
    const existingMetric = await this.artistMetricModel
      .findOne({ artistId })
      .exec();

    if (existingMetric) {
      throw new BadRequestException('Artist already exists');
    }

    const artistMetric = new this.artistMetricModel({
      artistId,
      listeners: [],
    });

    await artistMetric.save();

    return {
      message: 'Artist created successfully',
      artistId,
    };
  }

  async addListener(artistId: string, userId: string) {
    const exists = await this.artistExists(artistId);
    if (!exists) {
      throw new NotFoundException('Artist not found');
    }

    const data = { artistId, userId, timestamp: new Date() };

    await this.channelWrapper.publish(
      'metrics_exchange',
      'metrics.artist.listener',
      Buffer.from(JSON.stringify(data)),
    );

    return { message: 'Artist listener recorded' };
  }

  async getMonthlyListeners(artistId: string) {
    const artistMetric = await this.artistMetricModel
      .findOne({ artistId })
      .exec();

    if (!artistMetric) {
      throw new NotFoundException('Artist not found');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentListeners = artistMetric.listeners.filter(
      (listener) => new Date(listener.timestamp) >= thirtyDaysAgo,
    );

    const uniqueListeners = new Set(
      recentListeners.map((listener) => listener.userId),
    );

    return {
      artistId,
      monthlyListeners: uniqueListeners.size,
      periodStart: thirtyDaysAgo,
      periodEnd: new Date(),
      lastUpdated: artistMetric.timestamp,
    };
  }

  async getAllArtistsMetrics() {
    const artists = await this.artistMetricModel.find().exec();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return artists.map((artist) => {
      const recentListeners = artist.listeners.filter(
        (listener) => new Date(listener.timestamp) >= thirtyDaysAgo,
      );

      const uniqueListeners = new Set(
        recentListeners.map((listener) => listener.userId),
      );

      return {
        artistId: artist.artistId,
        monthlyListeners: uniqueListeners.size,
        lastUpdated: artist.timestamp,
      };
    });
  }

  async deleteArtist(artistId: string) {
    const exists = await this.artistExists(artistId);
    if (!exists) {
      throw new NotFoundException('Artist not found');
    }

    await this.artistMetricModel.deleteOne({ artistId }).exec();

    return {
      message: 'Artist deleted successfully',
      artistId,
    };
  }
}
