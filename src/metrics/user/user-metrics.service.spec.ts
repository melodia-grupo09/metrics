import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UserMetricsService } from './user-metrics.service';
import { UserMetric, UserEventType } from '../entities/user-metric.entity';
import { UserPlay } from '../entities/user-play.entity';

// Mock amqp-connection-manager
const mockRabbitMQ = jest.fn();
const mockAddSetup = jest.fn(() => Promise.resolve());

jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn(() => ({
    createChannel: jest.fn(() => ({
      addSetup: mockAddSetup,
      publish: mockRabbitMQ,
    })),
  })),
}));

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
  mockModel.find = jest.fn().mockReturnValue({
    exec: jest.fn(),
  });
  mockModel.deleteMany = jest.fn().mockReturnValue({
    exec: jest.fn(),
  });
  mockModel.aggregate = jest.fn().mockReturnValue(Promise.resolve([]));
  mockModel.prototype.save = jest.fn();

  const mockUserPlayModel = function (dto: any) {
    this.data = dto;
    this.save = jest.fn().mockResolvedValue(this.data);
    return this;
  };
  mockUserPlayModel.countDocuments = jest.fn();
  mockUserPlayModel.aggregate = jest.fn().mockReturnValue(Promise.resolve([]));
  mockUserPlayModel.deleteMany = jest.fn().mockReturnValue({
    exec: jest.fn(),
  });
  mockUserPlayModel.prototype.save = jest.fn();

  beforeEach(async () => {
    mockRabbitMQ.mockClear();
    mockAddSetup.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserMetricsService,
        {
          provide: getModelToken(UserMetric.name),
          useValue: mockModel,
        },
        {
          provide: getModelToken(UserPlay.name),
          useValue: mockUserPlayModel,
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
      expect(mockRabbitMQ).toHaveBeenCalledTimes(1);
      expect(mockRabbitMQ).toHaveBeenCalledWith(
        'metrics_exchange',
        'metrics.user.registration',
        expect.any(Buffer),
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
      expect(mockRabbitMQ).toHaveBeenCalledTimes(1);
      expect(mockRabbitMQ).toHaveBeenCalledWith(
        'metrics_exchange',
        'metrics.user.login',
        expect.any(Buffer),
      );
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
      expect(mockRabbitMQ).toHaveBeenCalledTimes(1);
      expect(mockRabbitMQ).toHaveBeenCalledWith(
        'metrics_exchange',
        'metrics.user.activity',
        expect.any(Buffer),
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

  describe('deleteUser', () => {
    it('should delete user metrics successfully', async () => {
      const userId = 'user123';
      const mockUserEvents = [
        { userId, eventType: 'registration', timestamp: new Date() },
      ];

      mockModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUserEvents),
      });

      mockModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      mockUserPlayModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await service.deleteUser(userId);

      expect(mockModel.find).toHaveBeenCalledWith({ userId });
      expect(mockModel.deleteMany).toHaveBeenCalledWith({ userId });
      expect(mockUserPlayModel.deleteMany).toHaveBeenCalledWith({ userId });
      expect(result).toEqual({ message: 'User metrics deleted successfully' });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const userId = 'nonexistent-user';

      mockModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await expect(service.deleteUser(userId)).rejects.toThrow(
        'User not found',
      );
      expect(mockModel.find).toHaveBeenCalledWith({ userId });
      expect(mockModel.deleteMany).not.toHaveBeenCalled();
      expect(mockUserPlayModel.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('getUserContentAnalytics', () => {
    it('should get user content analytics without date filters', async () => {
      const userId = 'user-test-123';

      const mockTopSongs = [
        { songId: 'song-001', plays: 5 },
        { songId: 'song-002', plays: 3 },
      ];

      const mockTopArtists = [
        { artistId: 'artist-001', totalPlays: 8 },
        { artistId: 'artist-002', totalPlays: 4 },
      ];

      mockUserPlayModel.aggregate
        .mockResolvedValueOnce(mockTopSongs)
        .mockResolvedValueOnce(mockTopArtists);

      mockUserPlayModel.countDocuments.mockResolvedValue(8);

      const result = await service.getUserContentAnalytics(userId);

      expect(result).toEqual({
        userId,
        period: {
          startDate: null,
          endDate: null,
        },
        topSongs: mockTopSongs,
        topArtists: mockTopArtists,
        listeningStats: {
          totalPlays: 8,
          estimatedHours: 0.47, // 8 * 3.5 / 60 = 0.47
        },
      });
      expect(mockUserPlayModel.aggregate).toHaveBeenCalledTimes(2);
      expect(mockUserPlayModel.countDocuments).toHaveBeenCalledWith({ userId });
    });

    it('should get user content analytics with date filters', async () => {
      const userId = 'user-test-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockTopSongs = [{ songId: 'song-001', plays: 3 }];
      const mockTopArtists = [{ artistId: 'artist-001', totalPlays: 3 }];

      mockUserPlayModel.aggregate
        .mockResolvedValueOnce(mockTopSongs)
        .mockResolvedValueOnce(mockTopArtists);

      mockUserPlayModel.countDocuments.mockResolvedValue(3);

      const result = await service.getUserContentAnalytics(
        userId,
        startDate,
        endDate,
      );

      expect(result).toEqual({
        userId,
        period: {
          startDate,
          endDate,
        },
        topSongs: mockTopSongs,
        topArtists: mockTopArtists,
        listeningStats: {
          totalPlays: 3,
          estimatedHours: 0.18, // 3 * 3.5 / 60 = 0.175 => 0.18
        },
      });
      expect(mockUserPlayModel.countDocuments).toHaveBeenCalledWith({
        userId,
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      });
    });

    it('should return empty arrays when user has no plays', async () => {
      const userId = 'user-no-plays';

      mockUserPlayModel.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockUserPlayModel.countDocuments.mockResolvedValue(0);

      const result = await service.getUserContentAnalytics(userId);

      expect(result).toEqual({
        userId,
        period: {
          startDate: null,
          endDate: null,
        },
        topSongs: [],
        topArtists: [],
        listeningStats: {
          totalPlays: 0,
          estimatedHours: 0,
        },
      });
    });
  });

  describe('getUserActivityPatterns', () => {
    it('should get user activity patterns successfully', async () => {
      const userId = 'user-test-123';

      const mockActivityByHour = [
        { hour: 20, count: 15 },
        { hour: 14, count: 10 },
        { hour: 9, count: 8 },
        { hour: 22, count: 5 },
        { hour: 18, count: 3 },
      ];

      const mockDistinctDays = [
        new Date('2024-01-01T10:00:00'),
        new Date('2024-01-01T14:00:00'), // Same day
        new Date('2024-01-02T10:00:00'),
        new Date('2024-01-03T10:00:00'),
      ];

      mockModel.aggregate.mockResolvedValue(mockActivityByHour);
      mockModel.distinct.mockReturnValue(mockDistinctDays);

      const result = await service.getUserActivityPatterns(userId);

      expect(result).toEqual({
        userId,
        activityPatterns: {
          peakHours: mockActivityByHour.slice(0, 5),
          totalActivities: 41, // 15 + 10 + 8 + 5 + 3
          activeDays: 3, // unique days: 01, 02, 03
          averageActivitiesPerDay: 13.67, // 41 / 3
        },
      });
      expect(mockModel.aggregate).toHaveBeenCalledWith([
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
    });

    it('should return empty patterns when user has no activities', async () => {
      const userId = 'user-no-activity';

      mockModel.aggregate.mockResolvedValue([]);
      mockModel.distinct.mockReturnValue([]);

      const result = await service.getUserActivityPatterns(userId);

      expect(result).toEqual({
        userId,
        activityPatterns: {
          peakHours: [],
          totalActivities: 0,
          activeDays: 0,
          averageActivitiesPerDay: 0,
        },
      });
    });

    it('should handle single activity correctly', async () => {
      const userId = 'user-single-activity';

      const mockActivityByHour = [{ hour: 15, count: 1 }];

      const mockDistinctDays = [new Date('2024-01-01T15:00:00')];

      mockModel.aggregate.mockResolvedValue(mockActivityByHour);
      mockModel.distinct.mockReturnValue(mockDistinctDays);

      const result = await service.getUserActivityPatterns(userId);

      expect(result).toEqual({
        userId,
        activityPatterns: {
          peakHours: [{ hour: 15, count: 1 }],
          totalActivities: 1,
          activeDays: 1,
          averageActivitiesPerDay: 1,
        },
      });
    });
  });

  describe('exportUserMetrics', () => {
    it('should export user metrics in JSON format', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(5),
      });

      mockModel.distinct
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(['user1', 'user2', 'user3']),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(['user1', 'user2']),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(['user1']),
        });

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              userId: 'user1',
              timestamp: new Date('2024-01-15'),
              metadata: { email: 'user1@test.com' },
            },
            {
              userId: 'user2',
              timestamp: new Date('2024-02-20'),
              metadata: { email: 'user2@test.com' },
            },
          ]),
        }),
      });

      const result = await service.exportUserMetrics(
        startDate,
        endDate,
        'json',
      );

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('users');

      // Type guard for JSON format
      if (typeof result.summary === 'object') {
        expect(result.summary.metrics.totalRegistrations).toBe(5);
        expect(result.summary.metrics.activeUsers).toBe(3);
      }

      if (Array.isArray(result.users)) {
        expect(result.users).toHaveLength(2);
        expect(result.users[0]).toEqual({
          userId: 'user1',
          registrationDate: new Date('2024-01-15').toISOString(),
          metadata: { email: 'user1@test.com' },
        });
      }
    });

    it('should export user metrics in CSV format', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(2),
      });

      mockModel.distinct
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(['user1', 'user2']),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(['user1']),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(['user1']),
        });

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              userId: 'user1',
              timestamp: new Date('2024-01-15'),
              metadata: {},
            },
          ]),
        }),
      });

      const result = await service.exportUserMetrics(startDate, endDate, 'csv');

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('format', 'csv');
      expect(typeof result.summary).toBe('string');
      expect(typeof result.users).toBe('string');
      expect(result.summary).toContain('startDate');
      expect(result.summary).toContain('totalRegistrations');
      expect(result.users).toContain('userId');
      expect(result.users).toContain('registrationDate');
    });

    it('should default to CSV format when format not specified', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(1),
      });

      mockModel.distinct
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(['user1']),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(['user1']),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(['user1']),
        });

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.exportUserMetrics(startDate, endDate);

      expect(result).toHaveProperty('format', 'csv');
      expect(typeof result.summary).toBe('string');
      expect(typeof result.users).toBe('string');
    });
  });
});
