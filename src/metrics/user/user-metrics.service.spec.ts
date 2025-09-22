import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserMetricsService } from './user-metrics.service';
import { UserMetric } from './user-metric.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UserMetricsService', () => {
  let service: UserMetricsService;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
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

  describe('registerUser', () => {
    it('should register a user successfully', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const email = 'test@example.com';
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        userId,
        email,
        registrationDate: expect.any(Date) as unknown as Date,
        lastActiveDate: expect.any(Date) as unknown as Date,
      });
      mockRepository.save.mockResolvedValue({});

      const result = await service.registerUser(userId, email);

      expect(result).toEqual({
        message: 'User registered successfully',
        userId,
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.user', {
        userId,
        email,
        metricType: 'registration',
        timestamp: expect.any(Date) as unknown as Date,
      });
    });

    it('should throw BadRequestException if user already exists', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const email = 'test@example.com';
      mockRepository.findOne.mockResolvedValue({ userId });

      await expect(service.registerUser(userId, email)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe('updateUserActivity', () => {
    it('should update user activity successfully', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const userMetric = {
        userId,
        lastActiveDate: new Date(),
      };
      mockRepository.findOne.mockResolvedValue(userMetric);
      mockRepository.save.mockResolvedValue(userMetric);

      const result = await service.updateUserActivity(userId);

      expect(result).toEqual({
        message: 'User activity updated',
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.user', {
        userId,
        metricType: 'activity',
        timestamp: expect.any(Date) as unknown as Date,
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateUserActivity(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getNewRegistrations', () => {
    it('should get new registrations successfully', async () => {
      const users = [
        {
          userId: 'user1',
          email: 'user1@example.com',
          registrationDate: new Date(),
        },
        {
          userId: 'user2',
          email: 'user2@example.com',
          registrationDate: new Date(),
        },
      ];
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue(users);

      const result = await service.getNewRegistrations();

      expect(result).toEqual({
        totalRegistrations: 2,
        users: users.map((user) => ({
          userId: user.userId,
          email: user.email,
          registrationDate: user.registrationDate,
        })),
      });
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    });

    it('should get new registrations with date filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const users = [
        {
          userId: 'user1',
          email: 'user1@example.com',
          registrationDate: new Date(),
        },
      ];
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue(users);

      const result = await service.getNewRegistrations(startDate, endDate);

      expect(result).toEqual({
        totalRegistrations: 1,
        users: users.map((user) => ({
          userId: user.userId,
          email: user.email,
          registrationDate: user.registrationDate,
        })),
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.registrationDate >= :startDate',
        { startDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.registrationDate <= :endDate',
        { endDate },
      );
    });
  });
});
