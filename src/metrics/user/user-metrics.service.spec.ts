import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UserMetricsService } from './user-metrics.service';
import { UserMetric, UserEventType } from '../entities/user-metric.entity';

describe('UserMetricsService', () => {
  let service: UserMetricsService;

  const mockModel = function (dto: any) {
    this.data = dto;
    this.save = jest.fn().mockResolvedValue(this.data);
    return this;
  };
  mockModel.countDocuments = jest.fn().mockReturnValue({
    exec: jest.fn(),
  });
  mockModel.distinct = jest.fn().mockReturnValue({
    exec: jest.fn(),
  });
  mockModel.prototype.save = jest.fn();

  const mockRabbitClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserMetricsService,
        {
          provide: getModelToken(UserMetric.name),
          useValue: mockModel,
        },
        {
          provide: 'METRICS_SERVICE',
          useValue: mockRabbitClient,
        },
      ],
    }).compile();

    service = module.get<UserMetricsService>(UserMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordRegistration', () => {
    it('should record a user registration successfully', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const metadata = { source: 'web' };

      const result = await service.recordRegistration(userId, metadata);

      expect(result).toEqual({
        message: 'User registration recorded',
        userId,
      });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith(
        'metrics.user.registration',
        {
          userId,
          eventType: UserEventType.REGISTRATION,
          metadata,
          timestamp: expect.any(Date),
        },
      );
    });
  });

  describe('recordLogin', () => {
    it('should record a user login successfully', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const metadata = { device: 'mobile' };

      const result = await service.recordLogin(userId, metadata);

      expect(result).toEqual({
        message: 'User login recorded',
        userId,
      });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.user.login', {
        userId,
        eventType: UserEventType.LOGIN,
        metadata,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('recordActivity', () => {
    it('should record user activity successfully', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const metadata = { action: 'play_song' };

      const result = await service.recordActivity(userId, metadata);

      expect(result).toEqual({
        message: 'User activity recorded',
        userId,
      });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith(
        'metrics.user.activity',
        {
          userId,
          eventType: UserEventType.ACTIVITY,
          metadata,
          timestamp: expect.any(Date),
        },
      );
    });
  });

  describe('getNewRegistrations', () => {
    it('should get new registrations count successfully', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      mockModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(42),
      });

      const result = await service.getNewRegistrations(startDate, endDate);

      expect(result).toEqual({
        totalRegistrations: 42,
        startDate,
        endDate,
      });
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        eventType: UserEventType.REGISTRATION,
        timestamp: { $gte: startDate, $lte: endDate },
      });
    });
  });

  describe('getActiveUsers', () => {
    it('should get active users count successfully', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockModel.distinct.mockReturnValueOnce({
        exec: jest
          .fn()
          .mockResolvedValue(['user1', 'user2', 'user3', 'user4', 'user5']),
      });

      const result = await service.getActiveUsers(startDate, endDate);

      expect(result).toEqual({
        activeUsers: 5,
        startDate,
        endDate,
      });
      expect(mockModel.distinct).toHaveBeenCalledWith('userId', {
        eventType: { $in: [UserEventType.LOGIN, UserEventType.ACTIVITY] },
        timestamp: { $gte: startDate, $lte: endDate },
      });
    });
  });

  describe('getUserRetention', () => {
    it('should calculate user retention successfully', async () => {
      const cohortStartDate = new Date('2024-01-01');
      const cohortEndDate = new Date('2024-01-31');
      const daysAfter = 7;

      const registeredUserIds = ['user1', 'user2', 'user3'];
      const retainedUserIds = ['user1', 'user2'];

      mockModel.distinct
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(registeredUserIds),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(retainedUserIds),
        });

      const result = await service.getUserRetention(
        cohortStartDate,
        cohortEndDate,
        daysAfter,
      );

      expect(result).toEqual({
        totalRegistered: 3,
        retainedUsers: 2,
        retentionRate: 66.67,
        cohortStartDate,
        cohortEndDate,
        daysAfter,
      });
    });

    it('should return zero retention when no users registered', async () => {
      const cohortStartDate = new Date('2024-01-01');
      const cohortEndDate = new Date('2024-01-31');

      mockModel.distinct.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getUserRetention(
        cohortStartDate,
        cohortEndDate,
      );

      expect(result).toEqual({
        totalRegistered: 0,
        retainedUsers: 0,
        retentionRate: 0,
        cohortStartDate,
        cohortEndDate,
        daysAfter: 7,
      });
    });
  });
});
