import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { UserMetric } from './user-metric.entity';

@Injectable()
export class UserMetricsService {
  constructor(
    @InjectRepository(UserMetric)
    private userMetricRepository: Repository<UserMetric>,
    @Inject('METRICS_SERVICE') private readonly rabbitClient: ClientProxy,
  ) {}

  async registerUser(userId: string, email: string) {
    const existingUser = await this.userMetricRepository.findOne({
      where: { userId },
    });

    if (existingUser) {
      throw new BadRequestException('User already registered');
    }

    const userMetric = this.userMetricRepository.create({
      userId,
      email,
      registrationDate: new Date(),
      lastActiveDate: new Date(),
    });

    await this.userMetricRepository.save(userMetric);

    this.rabbitClient.emit('metrics.user', {
      userId,
      email,
      metricType: 'registration',
      timestamp: new Date(),
    });

    return {
      message: 'User registered successfully',
      userId,
    };
  }

  async updateUserActivity(userId: string) {
    const userMetric = await this.userMetricRepository.findOne({
      where: { userId },
    });

    if (!userMetric) {
      throw new NotFoundException('User not found');
    }

    userMetric.lastActiveDate = new Date();
    await this.userMetricRepository.save(userMetric);

    this.rabbitClient.emit('metrics.user', {
      userId,
      metricType: 'activity',
      timestamp: new Date(),
    });

    return {
      message: 'User activity updated',
    };
  }

  async getNewRegistrations(startDate?: Date, endDate?: Date) {
    const query = this.userMetricRepository.createQueryBuilder('user');

    if (startDate) {
      query.andWhere('user.registrationDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('user.registrationDate <= :endDate', { endDate });
    }

    const users = await query.getMany();
    const totalRegistrations = users.length;

    return {
      totalRegistrations,
      users: users.map((user) => ({
        userId: user.userId,
        email: user.email,
        registrationDate: user.registrationDate,
      })),
    };
  }
}
