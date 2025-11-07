import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SongMetric } from '../entities/song-metric.entity';

interface SongMetricEvent {
  songId: string;
  artistId: string;
  userId: string;
  metricType: 'play' | 'like' | 'share';
  timestamp: Date;
}

@Injectable()
export class SongMetricsConsumer implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(SongMetricsConsumer.name);

  constructor(
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

  public async onModuleInit() {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.assertExchange('metrics_exchange', 'topic', {
        durable: true,
      });

      const queue = await channel.assertQueue('song_metrics_queue', {
        durable: true,
      });

      await channel.bindQueue(
        queue.queue,
        'metrics_exchange',
        'metrics.song.*',
      );

      await channel.consume(queue.queue, (message: ConsumeMessage | null) => {
        if (message) {
          void this.handleSongMetric(message);
        }
      });

      this.logger.log('Song metrics consumer initialized and listening...');
    });
  }

  public async handleSongMetric(message: ConsumeMessage) {
    try {
      const content = JSON.parse(message.content.toString()) as SongMetricEvent;
      this.logger.log(
        `Processing song metric: ${content.metricType} for song ${content.songId}`,
      );

      const existingSong = await this.songMetricModel
        .findOne({ songId: content.songId })
        .exec();

      if (!existingSong) {
        this.logger.warn(`Song ${content.songId} not found, skipping metric`);
        this.channelWrapper.ack(message);
        return;
      }

      switch (content.metricType) {
        case 'play':
          existingSong.plays += 1;
          break;
        case 'like':
          existingSong.likes += 1;
          break;
        case 'share':
          existingSong.shares += 1;
          break;
        default:
          this.logger.warn(
            `Unknown metric type: ${content.metricType as string}`,
          );
          this.channelWrapper.ack(message);
          return;
      }

      await existingSong.save();

      if (content.metricType === 'play') {
        try {
          const artistEvent = {
            artistId: content.artistId,
            userId: content.userId,
            timestamp: new Date(),
          };

          await this.channelWrapper.publish(
            'metrics_exchange',
            'metrics.artist.listener',
            Buffer.from(JSON.stringify(artistEvent)),
          );

          this.logger.log(
            `Artist listener event published for artist ${content.artistId}`,
          );

          // Publicar evento de play del usuario
          const userPlayEvent = {
            userId: content.userId,
            songId: content.songId,
            artistId: content.artistId,
            timestamp: new Date(),
          };

          await this.channelWrapper.publish(
            'metrics_exchange',
            'metrics.user.play',
            Buffer.from(JSON.stringify(userPlayEvent)),
          );

          this.logger.log(
            `User play event published for user ${content.userId}`,
          );
        } catch (error) {
          this.logger.error('Error publishing artist listener event:', error);
          // No fallamos el proceso principal si falla el evento del artista
        }
      }

      this.channelWrapper.ack(message);

      this.logger.log(
        `Song metric updated: ${content.metricType} for song ${content.songId}`,
      );
    } catch (error) {
      this.logger.error('Error processing song metric:', error);
      this.channelWrapper.nack(message, false, false);
    }
  }
}
