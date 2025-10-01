import { Test, TestingModule } from '@nestjs/testing';
import { UserMetricsController } from './user-metrics.controller';
import { UserMetricsService } from './user-metrics.service';

describe('UserMetricsController', () => {
  let controller: UserMetricsController;

  const mockUserMetricsService = {
    recordRegistration: jest.fn(),
    recordLogin: jest.fn(),
    recordActivity: jest.fn(),
    getNewRegistrations: jest.fn(),
    getActiveUsers: jest.fn(),
    getUserRetention: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserMetricsController],
      providers: [
        {
          provide: UserMetricsService,
          useValue: mockUserMetricsService,
        },
      ],
    }).compile();

    controller = module.get<UserMetricsController>(UserMetricsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordRegistration', () => {
    it('should record a user registration successfully', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const metadata = { source: 'web' };
      const result = {
        message: 'User registration recorded',
        userId,
      };
      mockUserMetricsService.recordRegistration.mockResolvedValue(result);

      expect(await controller.recordRegistration(userId, metadata)).toBe(
        result,
      );
      expect(mockUserMetricsService.recordRegistration).toHaveBeenCalledWith(
        userId,
        metadata,
      );
    });
  });

  describe('recordLogin', () => {
    it('should record a user login successfully', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const metadata = { device: 'mobile' };
      const result = {
        message: 'User login recorded',
        userId,
      };
      mockUserMetricsService.recordLogin.mockResolvedValue(result);

      expect(await controller.recordLogin(userId, metadata)).toBe(result);
      expect(mockUserMetricsService.recordLogin).toHaveBeenCalledWith(
        userId,
        metadata,
      );
    });
  });

  describe('recordActivity', () => {
    it('should record user activity successfully', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const metadata = { action: 'play_song' };
      const result = {
        message: 'User activity recorded',
        userId,
      };
      mockUserMetricsService.recordActivity.mockResolvedValue(result);

      expect(await controller.recordActivity(userId, metadata)).toBe(result);
      expect(mockUserMetricsService.recordActivity).toHaveBeenCalledWith(
        userId,
        metadata,
      );
    });
  });

  describe('getNewRegistrations', () => {
    it('should get new registrations count successfully', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const result = {
        totalRegistrations: 42,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
      mockUserMetricsService.getNewRegistrations.mockResolvedValue(result);

      expect(await controller.getNewRegistrations(startDate, endDate)).toBe(
        result,
      );
      expect(mockUserMetricsService.getNewRegistrations).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
      );
    });
  });

  describe('getActiveUsers', () => {
    it('should get active users count successfully', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const result = {
        activeUsers: 25,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
      mockUserMetricsService.getActiveUsers.mockResolvedValue(result);

      expect(await controller.getActiveUsers(startDate, endDate)).toBe(result);
      expect(mockUserMetricsService.getActiveUsers).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
      );
    });
  });

  describe('getUserRetention', () => {
    it('should get user retention metrics successfully', async () => {
      const cohortStartDate = '2024-01-01';
      const cohortEndDate = '2024-01-31';
      const daysAfter = 7;
      const result = {
        totalRegistered: 100,
        retainedUsers: 65,
        retentionRate: 65.0,
        cohortStartDate: new Date(cohortStartDate),
        cohortEndDate: new Date(cohortEndDate),
        daysAfter,
      };
      mockUserMetricsService.getUserRetention.mockResolvedValue(result);

      expect(
        await controller.getUserRetention(
          cohortStartDate,
          cohortEndDate,
          daysAfter,
        ),
      ).toBe(result);
      expect(mockUserMetricsService.getUserRetention).toHaveBeenCalledWith(
        new Date(cohortStartDate),
        new Date(cohortEndDate),
        daysAfter,
      );
    });

    it('should use default daysAfter value', async () => {
      const cohortStartDate = '2024-01-01';
      const cohortEndDate = '2024-01-31';
      const result = {
        totalRegistered: 100,
        retainedUsers: 65,
        retentionRate: 65.0,
        cohortStartDate: new Date(cohortStartDate),
        cohortEndDate: new Date(cohortEndDate),
        daysAfter: 7,
      };
      mockUserMetricsService.getUserRetention.mockResolvedValue(result);

      await controller.getUserRetention(cohortStartDate, cohortEndDate, 7);

      expect(mockUserMetricsService.getUserRetention).toHaveBeenCalledWith(
        new Date(cohortStartDate),
        new Date(cohortEndDate),
        7,
      );
    });
  });
});
