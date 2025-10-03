import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserMetric, UserEventType } from '../entities/user-metric.entity';

interface UserEventMessage {
  userId: string;
  eventType: UserEventType;
  metadata?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class UserMetricsConsumer implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(UserMetricsConsumer.name);

  constructor(
    @InjectModel(UserMetric.name)
    private userEventModel: Model<UserMetric>,
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

      const queue = await channel.assertQueue('user_metrics_queue', {
        durable: true,
      });

      await channel.bindQueue(
        queue.queue,
        'metrics_exchange',
        'metrics.user.*',
      );

      await channel.consume(queue.queue, (message: ConsumeMessage | null) => {
        if (message) {
          void this.handleUserEvent(message);
        }
      });

      this.logger.log('User metrics consumer initialized and listening...');
    });
  }

  public async handleUserEvent(message: ConsumeMessage) {
    try {
      const content = JSON.parse(
        message.content.toString(),
      ) as UserEventMessage;
      this.logger.log(
        `Processing user event: ${content.eventType} for user ${content.userId}`,
      );

      const userMetric = new this.userEventModel({
        userId: content.userId,
        eventType: content.eventType,
        metadata: content.metadata || {},
        timestamp: content.timestamp || new Date(),
      });

      await userMetric.save();
      this.channelWrapper.ack(message);

      this.logger.log(
        `User event recorded: ${content.eventType} for user ${content.userId}`,
      );
    } catch (error) {
      this.logger.error('Error processing user event:', error);
      this.channelWrapper.nack(message, false, false);
    }
  }
}
