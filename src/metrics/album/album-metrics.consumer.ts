import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AlbumMetric } from '../entities/album-metric.entity';
import { UserLike } from '../entities/user-like.entity';
import { UserShare } from '../entities/user-share.entity';

interface AlbumMetricEvent {
  albumId: string;
  artistId: string;
  userId: string;
  metricType: 'like' | 'share';
  timestamp: Date;
}

@Injectable()
export class AlbumMetricsConsumer implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(AlbumMetricsConsumer.name);

  constructor(
    @InjectModel(AlbumMetric.name)
    private albumMetricModel: Model<AlbumMetric>,
    @InjectModel(UserLike.name) private userLikeModel: Model<UserLike>,
    @InjectModel(UserShare.name) private userShareModel: Model<UserShare>,
  ) {
    const rabbitUrl =
      process.env.CLOUDAMQP_URL ||
      process.env.RABBITMQ_URL ||
      'amqp://localhost:5672';
    const connection = amqp.connect([rabbitUrl]);
    this.channelWrapper = connection.createChannel();
  }

  public async onModuleInit() {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.assertExchange('metrics_exchange', 'topic', {
        durable: true,
      });

      const queue = await channel.assertQueue('album_metrics_queue', {
        durable: true,
      });

      await channel.bindQueue(
        queue.queue,
        'metrics_exchange',
        'metrics.album.*',
      );

      await channel.consume(queue.queue, (message: ConsumeMessage | null) => {
        if (message) {
          void this.handleAlbumMetric(message);
        }
      });

      this.logger.log('Album metrics consumer initialized and listening...');
    });
  }

  public async handleAlbumMetric(message: ConsumeMessage) {
    try {
      const content = JSON.parse(
        message.content.toString(),
      ) as AlbumMetricEvent;
      this.logger.log(
        `Processing album metric: ${content.metricType} for album ${content.albumId}`,
      );

      const existingAlbum = await this.albumMetricModel
        .findOne({ albumId: content.albumId })
        .exec();

      if (!existingAlbum) {
        this.logger.warn(`Album ${content.albumId} not found, skipping metric`);
        this.channelWrapper.ack(message);
        return;
      }

      switch (content.metricType) {
        case 'like':
          existingAlbum.likes += 1;
          await this.userLikeModel.create({
            userId: content.userId,
            entityId: content.albumId,
            entityType: 'album',
            artistId: content.artistId,
            timestamp: content.timestamp,
          });
          break;
        case 'share':
          existingAlbum.shares += 1;
          await this.userShareModel.create({
            userId: content.userId,
            entityId: content.albumId,
            entityType: 'album',
            artistId: content.artistId,
            timestamp: content.timestamp,
          });
          break;
        default:
          this.logger.warn(
            `Unknown metric type: ${content.metricType as string}`,
          );
          this.channelWrapper.ack(message);
          return;
      }

      await existingAlbum.save();
      this.channelWrapper.ack(message);

      this.logger.log(
        `Album metric updated: ${content.metricType} for album ${content.albumId}`,
      );
    } catch (error) {
      this.logger.error('Error processing album metric:', error);
      this.channelWrapper.nack(message, false, false);
    }
  }
}
