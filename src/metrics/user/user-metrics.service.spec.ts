import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserMetricsService } from './user-metrics.service';
import { UserMetric, UserEventType } from '../entities/user-metric.entity';

describe('UserMetricsService', () => {
  let service: UserMetricsService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  const mockRabbitClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserMetricsService,
        {
          provide: getRepositoryToken(UserMetric),
          useValue: mockRepository,
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
      const mockEvent = {
        userId,
        eventType: UserEventType.REGISTRATION,
        timestamp: expect.any(Date),
        metadata,
      };

      mockRepository.create.mockReturnValue(mockEvent);
      mockRepository.save.mockResolvedValue(mockEvent);

      const result = await service.recordRegistration(userId, metadata);

      expect(result).toEqual({
        message: 'User registration recorded',
        userId,
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId,
        eventType: UserEventType.REGISTRATION,
        timestamp: expect.any(Date),
        metadata,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockEvent);
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
      const mockEvent = {
        userId,
        eventType: UserEventType.LOGIN,
        timestamp: expect.any(Date),
        metadata,
      };

      mockRepository.create.mockReturnValue(mockEvent);
      mockRepository.save.mockResolvedValue(mockEvent);

      const result = await service.recordLogin(userId, metadata);

      expect(result).toEqual({
        message: 'User login recorded',
        userId,
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId,
        eventType: UserEventType.LOGIN,
        timestamp: expect.any(Date),
        metadata,
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
      const mockEvent = {
        userId,
        eventType: UserEventType.ACTIVITY,
        timestamp: expect.any(Date),
        metadata,
      };

      mockRepository.create.mockReturnValue(mockEvent);
      mockRepository.save.mockResolvedValue(mockEvent);

      const result = await service.recordActivity(userId, metadata);

      expect(result).toEqual({
        message: 'User activity recorded',
        userId,
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId,
        eventType: UserEventType.ACTIVITY,
        timestamp: expect.any(Date),
        metadata,
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
      mockRepository.count.mockResolvedValue(42);

      const result = await service.getNewRegistrations(startDate, endDate);

      expect(result).toEqual({
        totalRegistrations: 42,
        startDate,
        endDate,
      });
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          eventType: UserEventType.REGISTRATION,
          timestamp: expect.any(Object), // Between object
        },
      });
    });
  });

  describe('getActiveUsers', () => {
    it('should get active users count successfully', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawOne.mockResolvedValue({ count: '25' });

      const result = await service.getActiveUsers(startDate, endDate);

      expect(result).toEqual({
        activeUsers: 25,
        startDate,
        endDate,
      });
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('event');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'COUNT(DISTINCT event.userId)',
        'count',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'event.eventType IN (:...types)',
        {
          types: [UserEventType.LOGIN, UserEventType.ACTIVITY],
        },
      );
    });
  });

  describe('getUserRetention', () => {
    it('should calculate user retention successfully', async () => {
      const cohortStartDate = new Date('2024-01-01');
      const cohortEndDate = new Date('2024-01-31');
      const daysAfter = 7;

      const registeredUsers = [
        { userId: 'user1' },
        { userId: 'user2' },
        { userId: 'user3' },
      ];

      const retainedUsers = [{ userId: 'user1' }, { userId: 'user2' }];

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce(registeredUsers)
        .mockResolvedValueOnce(retainedUsers);

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

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

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
