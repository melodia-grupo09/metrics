import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { UserMetric, UserEventType } from '../entities/user-metric.entity';

@Injectable()
export class UserMetricsService implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(UserMetricsService.name);

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

  async onModuleInit() {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.assertExchange('metrics_exchange', 'topic', {
        durable: true,
      });
    });
  }

  // Simple endpoints for recording events
  async recordRegistration(userId: string, metadata?: Record<string, any>) {
    const event = new this.userEventModel({
      userId,
      eventType: UserEventType.REGISTRATION,
      timestamp: new Date(),
      metadata,
    });

    await event.save();

    const data = {
      userId,
      eventType: UserEventType.REGISTRATION,
      metadata,
      timestamp: new Date(),
    };

    await this.channelWrapper.publish(
      'metrics_exchange',
      'metrics.user.registration',
      Buffer.from(JSON.stringify(data)),
    );

    return {
      message: 'User registration recorded',
      userId,
    };
  }

  async recordLogin(userId: string, metadata?: Record<string, any>) {
    const event = new this.userEventModel({
      userId,
      eventType: UserEventType.LOGIN,
      timestamp: new Date(),
      metadata,
    });

    await event.save();

    const data = {
      userId,
      eventType: UserEventType.LOGIN,
      metadata,
      timestamp: new Date(),
    };

    await this.channelWrapper.publish(
      'metrics_exchange',
      'metrics.user.login',
      Buffer.from(JSON.stringify(data)),
    );

    return {
      message: 'User login recorded',
      userId,
    };
  }

  async recordActivity(userId: string, metadata?: Record<string, any>) {
    const event = new this.userEventModel({
      userId,
      eventType: UserEventType.ACTIVITY,
      timestamp: new Date(),
      metadata,
    });

    await event.save();

    const data = {
      userId,
      eventType: UserEventType.ACTIVITY,
      metadata,
      timestamp: new Date(),
    };

    await this.channelWrapper.publish(
      'metrics_exchange',
      'metrics.user.activity',
      Buffer.from(JSON.stringify(data)),
    );

    return {
      message: 'User activity recorded',
      userId,
    };
  }

  // Analytics endpoints - The 3 key metrics
  async getNewRegistrations(startDate: Date, endDate: Date) {
    const count = await this.userEventModel
      .countDocuments({
        eventType: UserEventType.REGISTRATION,
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .exec();

    return {
      totalRegistrations: count,
      startDate,
      endDate,
    };
  }

  async getActiveUsers(startDate: Date, endDate: Date) {
    const result = await this.userEventModel
      .distinct('userId', {
        eventType: { $in: [UserEventType.LOGIN, UserEventType.ACTIVITY] },
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .exec();

    return {
      activeUsers: result.length,
      startDate,
      endDate,
    };
  }

  async getUserRetention(
    cohortStartDate: Date,
    cohortEndDate: Date,
    daysAfter: number = 7,
  ) {
    // Get users who registered in the cohort period
    const registeredUserIds = await this.userEventModel
      .distinct('userId', {
        eventType: UserEventType.REGISTRATION,
        timestamp: { $gte: cohortStartDate, $lte: cohortEndDate },
      })
      .exec();

    if (registeredUserIds.length === 0) {
      return {
        totalRegistered: 0,
        retainedUsers: 0,
        retentionRate: 0,
        cohortStartDate,
        cohortEndDate,
        daysAfter,
      };
    }

    // Calculate the retention window
    const retentionStartDate = new Date(cohortEndDate);
    retentionStartDate.setDate(retentionStartDate.getDate() + daysAfter);
    const retentionEndDate = new Date(retentionStartDate);
    retentionEndDate.setDate(retentionEndDate.getDate() + 1);

    // Get users who were active after N days
    const retainedUserIds = await this.userEventModel
      .distinct('userId', {
        userId: { $in: registeredUserIds },
        eventType: { $in: [UserEventType.LOGIN, UserEventType.ACTIVITY] },
        timestamp: { $gte: retentionStartDate, $lte: retentionEndDate },
      })
      .exec();

    const totalRegistered = registeredUserIds.length;
    const totalRetained = retainedUserIds.length;
    const retentionRate = (totalRetained / totalRegistered) * 100;

    return {
      totalRegistered,
      retainedUsers: totalRetained,
      retentionRate: Math.round(retentionRate * 100) / 100,
      cohortStartDate,
      cohortEndDate,
      daysAfter,
    };
  }
}
