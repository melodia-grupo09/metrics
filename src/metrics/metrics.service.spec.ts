import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { SongMetric } from './entities/song-metric.entity';
import { AlbumMetric } from './entities/album-metric.entity';
import { SongAlbum } from './entities/song-album.entity';
import { UserMetric } from './entities/user-metric.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MetricsService', () => {
  let service: MetricsService;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRabbitClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: getRepositoryToken(SongMetric),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(AlbumMetric),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(SongAlbum),
          useValue: mockRepository,
        },
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

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSong', () => {
    it('should create a new song successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({
        songId,
        plays: 0,
        likes: 0,
        shares: 0,
      });

      const result = await service.createSong(songId);

      expect(result).toEqual({
        message: 'Song created successfully',
        songId,
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { songId },
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if song already exists', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue({ songId });

      await expect(service.createSong(songId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { songId },
      });
    });
  });

  describe('incrementSongPlays', () => {
    it('should increment song plays successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue({ songId });

      const result = await service.incrementSongPlays(songId);

      expect(result).toEqual({ message: 'Song play recorded' });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.song', {
        songId,
        metricType: 'play',
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = '550e8400-e29b-41d4-a716-446655440000';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.incrementSongPlays(songId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSongMetrics', () => {
    it('should return song metrics successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const mockMetrics = {
        songId,
        plays: 10,
        likes: 5,
        shares: 2,
      };
      mockRepository.findOne.mockResolvedValue(mockMetrics);

      const result = await service.getSongMetrics(songId);

      expect(result).toEqual({
        songId,
        plays: 10,
        likes: 5,
        shares: 2,
      });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = '550e8400-e29b-41d4-a716-446655440000';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getSongMetrics(songId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createAlbum', () => {
    it('should create a new album successfully', async () => {
      const albumId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({
        albumId,
        likes: 0,
        shares: 0,
      });

      const result = await service.createAlbum(albumId);

      expect(result).toEqual({
        message: 'Album created successfully',
        albumId,
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { albumId },
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if album already exists', async () => {
      const albumId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      mockRepository.findOne.mockResolvedValue({ albumId });

      await expect(service.createAlbum(albumId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addSongToAlbum', () => {
    it('should add song to album successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const albumId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

      // Mock song exists, album exists, no existing relation
      mockRepository.findOne
        .mockResolvedValueOnce({ songId }) // songExists check
        .mockResolvedValueOnce({ albumId }) // albumExists check (metric)
        .mockResolvedValueOnce(null) // albumExists check (relation)
        .mockResolvedValueOnce(null); // existing relation check

      mockRepository.save.mockResolvedValue({});

      const result = await service.addSongToAlbum(songId, albumId);

      expect(result).toEqual({
        message: 'Song added to album successfully',
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = '550e8400-e29b-41d4-a716-446655440000';
      const albumId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.addSongToAlbum(songId, albumId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if song is already in album', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const albumId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

      // Mock song exists, album exists, but relation already exists
      mockRepository.findOne
        .mockResolvedValueOnce({ songId }) // songExists check
        .mockResolvedValueOnce({ albumId }) // albumExists check (metric)
        .mockResolvedValueOnce(null) // albumExists check (relation)
        .mockResolvedValueOnce({ songId, albumId }); // existing relation check

      await expect(service.addSongToAlbum(songId, albumId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const email = 'user@example.com';
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        userId,
        email,
        registrationDate: new Date(),
        lastActiveDate: new Date(),
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
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.user', {
        userId,
        email,
        metricType: 'registration',
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should throw BadRequestException if user already exists', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const email = 'user@example.com';
      mockRepository.findOne.mockResolvedValue({ userId });

      await expect(service.registerUser(userId, email)).rejects.toThrow(
        BadRequestException,
      );
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
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.user', {
        userId,
        metricType: 'activity',
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateUserActivity(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getNewRegistrations', () => {
    it('should return new registrations successfully', async () => {
      const mockUsers = [
        {
          userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          email: 'user1@example.com',
          registrationDate: new Date(),
        },
        {
          userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          email: 'user2@example.com',
          registrationDate: new Date(),
        },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockUsers),
      };

      mockRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.getNewRegistrations();

      expect(result).toEqual({
        totalRegistrations: 2,
        users: mockUsers.map((user) => ({
          userId: user.userId,
          email: user.email,
          registrationDate: user.registrationDate,
        })),
      });
    });

    it('should return filtered registrations with date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockUsers = [
        {
          userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          email: 'user1@example.com',
          registrationDate: new Date('2024-01-15'),
        },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockUsers),
      };

      mockRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.getNewRegistrations(startDate, endDate);

      expect(result.totalRegistrations).toBe(1);
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
