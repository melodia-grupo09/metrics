import {
  Injectable,
  OnModuleInit,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { UserMetric, UserEventType } from '../entities/user-metric.entity';
import { UserPlay } from '../entities/user-play.entity';
import { parse } from 'json2csv';

@Injectable()
export class UserMetricsService implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(UserMetricsService.name);

  constructor(
    @InjectModel(UserMetric.name)
    private userEventModel: Model<UserMetric>,
    @InjectModel(UserPlay.name)
    private userPlayModel: Model<UserPlay>,
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

  async deleteUser(userId: string) {
    const userEvents = await this.userEventModel.find({ userId }).exec();

    if (userEvents.length === 0) {
      throw new NotFoundException('User not found');
    }

    await this.userEventModel.deleteMany({ userId }).exec();
    await this.userPlayModel.deleteMany({ userId }).exec();
    return { message: 'User metrics deleted successfully' };
  }

  // CA3: Detalle de métricas - Consumo de contenido
  async getUserContentAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // Build query filter
    interface DateFilter {
      userId: string;
      timestamp?: {
        $gte?: Date;
        $lte?: Date;
      };
    }

    const dateFilter: DateFilter = { userId };
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = startDate;
      if (endDate) dateFilter.timestamp.$lte = endDate;
    }

    // Top canciones del usuario
    const topSongs = await this.userPlayModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$songId',
          plays: { $sum: 1 },
        },
      },
      { $sort: { plays: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          songId: '$_id',
          plays: '$plays',
        },
      },
    ]);

    // Top artistas del usuario
    const topArtists = await this.userPlayModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$artistId',
          totalPlays: { $sum: 1 },
        },
      },
      { $sort: { totalPlays: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          artistId: '$_id',
          totalPlays: '$totalPlays',
        },
      },
    ]);

    // Total de plays y estimación de horas de escucha
    const totalPlays = await this.userPlayModel.countDocuments(dateFilter);
    // Asumiendo 3.5 minutos promedio por canción
    const estimatedListeningMinutes = totalPlays * 3.5;
    const estimatedListeningHours =
      Math.round((estimatedListeningMinutes / 60) * 100) / 100;

    return {
      userId,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      topSongs,
      topArtists,
      listeningStats: {
        totalPlays,
        estimatedHours: estimatedListeningHours,
      },
    };
  }

  // CA3: Detalle de métricas - Patrones de uso
  async getUserActivityPatterns(userId: string) {
    // Analizar horarios de mayor actividad desde login/activity events
    const activityByHour = await this.userEventModel.aggregate<{
      hour: number;
      count: number;
    }>([
      {
        $match: {
          userId,
          eventType: { $in: [UserEventType.LOGIN, UserEventType.ACTIVITY] },
        },
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          hour: '$_id',
          count: '$count',
        },
      },
    ]);

    const totalActivities = activityByHour.reduce(
      (sum, item) => sum + item.count,
      0,
    );

    // Calcular días activos
    const distinctDays = await this.userEventModel.distinct('timestamp', {
      userId,
      eventType: { $in: [UserEventType.LOGIN, UserEventType.ACTIVITY] },
    });

    const uniqueDays = new Set(
      distinctDays.map((date) => new Date(date).toISOString().split('T')[0]),
    ).size;

    const averageActivitiesPerDay =
      uniqueDays > 0
        ? Math.round((totalActivities / uniqueDays) * 100) / 100
        : 0;

    return {
      userId,
      activityPatterns: {
        peakHours: activityByHour.slice(0, 5), // Top 5 horas más activas
        totalActivities,
        activeDays: uniqueDays,
        averageActivitiesPerDay,
      },
    };
  }

  // CA2
  async exportUserMetrics(
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'json' = 'csv',
  ) {
    const registrations = await this.getNewRegistrations(startDate, endDate);
    const activeUsers = await this.getActiveUsers(startDate, endDate);
    const retention = await this.getUserRetention(startDate, endDate, 7);

    const userEvents = await this.userEventModel
      .find({
        eventType: UserEventType.REGISTRATION,
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .sort({ timestamp: 1 })
      .exec();

    const data = {
      summary: {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        metrics: {
          totalRegistrations: registrations.totalRegistrations,
          activeUsers: activeUsers.activeUsers,
          retentionRate: retention.retentionRate,
          totalRetained: retention.retainedUsers,
        },
      },
      users: userEvents.map((event) => ({
        userId: event.userId,
        registrationDate: event.timestamp.toISOString(),
        metadata: event.metadata || {},
      })),
    };

    if (format === 'json') {
      return data;
    }

    const summaryFields = [
      'startDate',
      'endDate',
      'totalRegistrations',
      'activeUsers',
      'retentionRate',
      'totalRetained',
    ];

    const summaryData = [
      {
        startDate: data.summary.period.startDate,
        endDate: data.summary.period.endDate,
        totalRegistrations: data.summary.metrics.totalRegistrations,
        activeUsers: data.summary.metrics.activeUsers,
        retentionRate: data.summary.metrics.retentionRate,
        totalRetained: data.summary.metrics.totalRetained,
      },
    ];

    const summaryCsv = parse(summaryData, { fields: summaryFields });

    // CSV de usuarios
    const usersFields = ['userId', 'registrationDate', 'metadata'];
    const usersCsv = parse(data.users, { fields: usersFields });

    return {
      summary: summaryCsv,
      users: usersCsv,
      format: 'csv',
    };
  }
}
