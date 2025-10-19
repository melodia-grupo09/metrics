import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ArtistMetric } from '../entities/artist-metric.entity';

interface ArtistListenerEvent {
  artistId: string;
  userId: string;
  timestamp: Date;
}

@Injectable()
export class ArtistMetricsConsumer implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(ArtistMetricsConsumer.name);

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

  public async onModuleInit() {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.assertExchange('metrics_exchange', 'topic', {
        durable: true,
      });

      const queue = await channel.assertQueue('artist_metrics_queue', {
        durable: true,
      });

      await channel.bindQueue(
        queue.queue,
        'metrics_exchange',
        'metrics.artist.*',
      );

      await channel.consume(queue.queue, (message: ConsumeMessage | null) => {
        if (message) {
          void this.handleArtistMetric(message);
        }
      });

      this.logger.log('Artist metrics consumer initialized and listening...');
    });
  }

  public async handleArtistMetric(message: ConsumeMessage) {
    try {
      const content = JSON.parse(
        message.content.toString(),
      ) as ArtistListenerEvent;
      this.logger.log(
        `Processing artist listener: user ${content.userId} for artist ${content.artistId}`,
      );

      const existingArtist = await this.artistMetricModel
        .findOne({ artistId: content.artistId })
        .exec();

      if (!existingArtist) {
        this.logger.warn(
          `Artist ${content.artistId} not found, skipping metric`,
        );
        this.channelWrapper.ack(message);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const listenerIndex = existingArtist.listeners.findIndex(
        (listener) =>
          listener.userId === content.userId &&
          new Date(listener.timestamp).toDateString() === today.toDateString(),
      );

      if (listenerIndex === -1) {
        existingArtist.listeners.push({
          userId: content.userId,
          timestamp: new Date(),
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        existingArtist.listeners = existingArtist.listeners.filter(
          (listener) => new Date(listener.timestamp) >= thirtyDaysAgo,
        );

        await existingArtist.save();

        this.logger.log(
          `Artist listener added: user ${content.userId} for artist ${content.artistId}`,
        );
      } else {
        this.logger.log(
          `User ${content.userId} already counted today for artist ${content.artistId}`,
        );
      }

      this.channelWrapper.ack(message);
    } catch (error) {
      this.logger.error('Error processing artist metric:', error);
      this.channelWrapper.nack(message, false, false);
    }
  }
}
