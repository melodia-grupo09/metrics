import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AlbumMetric } from './entities/album-metric.entity';
import { SongMetric } from './entities/song-metric.entity';
import { UserMetric, UserEventType } from './entities/user-metric.entity';

interface SongMetricEvent {
  songId: string;
  metricType: 'play' | 'like' | 'share';
  timestamp: Date;
}

interface AlbumMetricEvent {
  albumId: string;
  metricType: 'like' | 'share';
  timestamp: Date;
}

interface UserEventMessage {
  userId: string;
  eventType: UserEventType;
  metadata?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class MetricsConsumer implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(MetricsConsumer.name);

  constructor(
    @InjectModel(AlbumMetric.name)
    private albumMetricModel: Model<AlbumMetric>,
    @InjectModel(SongMetric.name)
    private songMetricModel: Model<SongMetric>,
    @InjectModel(UserMetric.name)
    private userEventModel: Model<UserMetric>,
  ) {
    const connection = amqp.connect(['amqp://localhost:5672']);
    this.channelWrapper = connection.createChannel();
  }

  public async onModuleInit() {
    try {
      await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
        // Topic exchange for better message routing
        const exchangeName = 'metrics_exchange';
        await channel.assertExchange(exchangeName, 'topic', { durable: true });

        const queueName = 'metrics_queue';
        await channel.assertQueue(queueName, { durable: true });

        // Bind the queue to different routing key patterns, allows RabbitMQ to handle routing natively
        await channel.bindQueue(queueName, exchangeName, 'metrics.song.*');
        await channel.bindQueue(queueName, exchangeName, 'metrics.album.*');
        await channel.bindQueue(queueName, exchangeName, 'metrics.user.*');

        // Route based on routing key
        await channel.consume(queueName, (message: ConsumeMessage | null) => {
          if (message) {
            void (async () => {
              try {
                const routingKey = message.fields.routingKey;
                const content = JSON.parse(
                  message.content.toString(),
                ) as unknown;

                this.logger.log(
                  `Received message with routing key: ${routingKey}`,
                );

                if (routingKey.startsWith('metrics.song.')) {
                  await this.handleSongMetric(content as SongMetricEvent);
                } else if (routingKey.startsWith('metrics.album.')) {
                  await this.handleAlbumMetric(content as AlbumMetricEvent);
                } else if (routingKey.startsWith('metrics.user.')) {
                  await this.handleUserEvent(content as UserEventMessage);
                } else {
                  this.logger.warn(`Unknown routing key: ${routingKey}`);
                }

                channel.ack(message);
              } catch (error) {
                this.logger.error('Error processing message:', error);
                // Acknowledge the message to prevent requeuing
                // TODO: In production, we might want to send to a dead letter queue instead
                channel.ack(message);
              }
            })();
          }
        });
      });

      this.logger.log('Metrics consumer started with topic exchange routing.');
    } catch (err) {
      this.logger.error('Error starting the consumer:', err);
    }
  }

  async handleSongMetric(eventData: SongMetricEvent): Promise<void> {
    this.logger.log('Processing song metric:', eventData);
    try {
      if (!eventData || !eventData.songId) {
        this.logger.error('Invalid message format: missing songId');
        return;
      }

      const songMetric = await this.songMetricModel
        .findOne({ songId: eventData.songId })
        .exec();

      if (!songMetric) {
        this.logger.warn(
          `Song ${eventData.songId} not found in database, skipping metric update`,
        );
        return;
      }

      switch (eventData.metricType) {
        case 'play':
          songMetric.plays += 1;
          break;
        case 'like':
          songMetric.likes += 1;
          break;
        case 'share':
          songMetric.shares += 1;
          break;
        default:
          this.logger.warn(
            `Unknown song metric type: ${String(eventData.metricType)}`,
          );
          return;
      }

      await songMetric.save();
      this.logger.log(
        `Updated ${eventData.metricType} for song ${eventData.songId}`,
      );
    } catch (error) {
      this.logger.error('Error processing song metric:', error);
      throw error;
    }
  }

  async handleUserEvent(eventData: UserEventMessage): Promise<void> {
    this.logger.log('Processing user event:', eventData);
    try {
      if (!eventData || !eventData.userId || !eventData.eventType) {
        this.logger.error(
          'Invalid message format: missing userId or eventType',
        );
        return;
      }

      const userEvent = new this.userEventModel({
        userId: eventData.userId,
        eventType: eventData.eventType,
        timestamp: new Date(eventData.timestamp),
        metadata: eventData.metadata,
      });

      await userEvent.save();
      this.logger.log(
        `Recorded ${eventData.eventType} event for user ${eventData.userId}`,
      );
    } catch (error) {
      this.logger.error('Error processing user event:', error);
      throw error;
    }
  }

  async handleAlbumMetric(eventData: AlbumMetricEvent): Promise<void> {
    this.logger.log('Processing album metric:', eventData);
    try {
      if (!eventData || !eventData.albumId) {
        this.logger.error('Invalid message format: missing albumId');
        return;
      }

      let albumMetric = await this.albumMetricModel
        .findOne({ albumId: eventData.albumId })
        .exec();

      if (!albumMetric) {
        albumMetric = new this.albumMetricModel({
          albumId: eventData.albumId,
          likes: 0,
          shares: 0,
        });
      }

      switch (eventData.metricType) {
        case 'like':
          albumMetric.likes += 1;
          break;
        case 'share':
          albumMetric.shares += 1;
          break;
        default:
          this.logger.warn(
            `Unknown album metric type: ${String(eventData.metricType)}`,
          );
          return;
      }

      await albumMetric.save();
      this.logger.log(
        `Updated ${eventData.metricType} for album ${eventData.albumId}`,
      );
    } catch (error) {
      this.logger.error('Error processing album metric:', error);
      throw error;
    }
  }
}
