import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { UserMetric, UserEventType } from '../entities/user-metric.entity';

@Injectable()
export class UserMetricsService {
  constructor(
    @InjectRepository(UserMetric)
    private userEventRepository: Repository<UserMetric>,
    @Inject('METRICS_SERVICE') private readonly rabbitClient: ClientProxy,
  ) {}

  // Simple endpoints for recording events
  async recordRegistration(userId: string, metadata?: Record<string, any>) {
    const event = this.userEventRepository.create({
      userId,
      eventType: UserEventType.REGISTRATION,
      timestamp: new Date(),
      metadata,
    });

    await this.userEventRepository.save(event);

    this.rabbitClient.emit('metrics.user.registration', {
      userId,
      eventType: UserEventType.REGISTRATION,
      metadata,
      timestamp: new Date(),
    });

    return {
      message: 'User registration recorded',
      userId,
    };
  }

  async recordLogin(userId: string, metadata?: Record<string, any>) {
    const event = this.userEventRepository.create({
      userId,
      eventType: UserEventType.LOGIN,
      timestamp: new Date(),
      metadata,
    });

    await this.userEventRepository.save(event);

    this.rabbitClient.emit('metrics.user.login', {
      userId,
      eventType: UserEventType.LOGIN,
      metadata,
      timestamp: new Date(),
    });

    return {
      message: 'User login recorded',
      userId,
    };
  }

  async recordActivity(userId: string, metadata?: Record<string, any>) {
    const event = this.userEventRepository.create({
      userId,
      eventType: UserEventType.ACTIVITY,
      timestamp: new Date(),
      metadata,
    });

    await this.userEventRepository.save(event);

    this.rabbitClient.emit('metrics.user.activity', {
      userId,
      eventType: UserEventType.ACTIVITY,
      metadata,
      timestamp: new Date(),
    });

    return {
      message: 'User activity recorded',
      userId,
    };
  }

  // Analytics endpoints - The 3 key metrics
  async getNewRegistrations(startDate: Date, endDate: Date) {
    const count = await this.userEventRepository.count({
      where: {
        eventType: UserEventType.REGISTRATION,
        timestamp: Between(startDate, endDate),
      },
    });

    return {
      totalRegistrations: count,
      startDate,
      endDate,
    };
  }

  async getActiveUsers(startDate: Date, endDate: Date) {
    const result = await this.userEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.eventType IN (:...types)', {
        types: [UserEventType.LOGIN, UserEventType.ACTIVITY],
      })
      .andWhere('event.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne<{ count: string }>();

    return {
      activeUsers: parseInt(result?.count || '0', 10),
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
    const registeredUsers = await this.userEventRepository
      .createQueryBuilder('event')
      .select('DISTINCT event.userId', 'userId')
      .where('event.eventType = :type', { type: UserEventType.REGISTRATION })
      .andWhere('event.timestamp BETWEEN :startDate AND :endDate', {
        startDate: cohortStartDate,
        endDate: cohortEndDate,
      })
      .getRawMany<{ userId: string }>();

    const registeredUserIds = registeredUsers.map((u) => u.userId);

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
    const retainedUsers = await this.userEventRepository
      .createQueryBuilder('event')
      .select('DISTINCT event.userId', 'userId')
      .where('event.userId IN (:...userIds)', { userIds: registeredUserIds })
      .andWhere('event.eventType IN (:...types)', {
        types: [UserEventType.LOGIN, UserEventType.ACTIVITY],
      })
      .andWhere('event.timestamp BETWEEN :startDate AND :endDate', {
        startDate: retentionStartDate,
        endDate: retentionEndDate,
      })
      .getRawMany<{ userId: string }>();

    const totalRegistered = registeredUserIds.length;
    const totalRetained = retainedUsers.length;
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
