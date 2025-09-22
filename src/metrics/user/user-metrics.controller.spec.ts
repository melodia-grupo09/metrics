import { Test, TestingModule } from '@nestjs/testing';
import { UserMetricsController } from './user-metrics.controller';
import { UserMetricsService } from './user-metrics.service';

describe('UserMetricsController', () => {
  let controller: UserMetricsController;

  const mockUserMetricsService = {
    registerUser: jest.fn(),
    updateUserActivity: jest.fn(),
    getNewRegistrations: jest.fn(),
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

  describe('registerUser', () => {
    it('should register a user successfully', async () => {
      const userRegistrationDto = {
        userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        email: 'test@example.com',
      };
      const result = {
        message: 'User registered successfully',
        userId: userRegistrationDto.userId,
      };
      mockUserMetricsService.registerUser.mockResolvedValue(result);

      expect(await controller.registerUser(userRegistrationDto)).toBe(result);
      expect(mockUserMetricsService.registerUser).toHaveBeenCalledWith(
        userRegistrationDto.userId,
        userRegistrationDto.email,
      );
    });
  });

  describe('updateUserActivity', () => {
    it('should update user activity successfully', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = { message: 'User activity updated' };
      mockUserMetricsService.updateUserActivity.mockResolvedValue(result);

      expect(await controller.updateUserActivity(userId)).toBe(result);
      expect(mockUserMetricsService.updateUserActivity).toHaveBeenCalledWith(
        userId,
      );
    });
  });

  describe('getNewRegistrations', () => {
    it('should get new registrations successfully', async () => {
      const result = {
        totalRegistrations: 5,
        users: [
          {
            userId: 'user1',
            email: 'user1@example.com',
            registrationDate: new Date(),
          },
        ],
      };
      mockUserMetricsService.getNewRegistrations.mockResolvedValue(result);

      expect(await controller.getNewRegistrations()).toBe(result);
      expect(mockUserMetricsService.getNewRegistrations).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it('should get new registrations with date filters', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const result = {
        totalRegistrations: 2,
        users: [
          {
            userId: 'user1',
            email: 'user1@example.com',
            registrationDate: new Date(),
          },
        ],
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
});
