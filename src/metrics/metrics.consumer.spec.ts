import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { MetricsConsumer } from './metrics.consumer';
import { AlbumMetric } from './entities/album-metric.entity';
import { SongMetric } from './entities/song-metric.entity';
import { UserMetric, UserEventType } from './entities/user-metric.entity';

// Mock amqp-connection-manager to prevent actual RabbitMQ connections
jest.mock('amqp-connection-manager', () => {
  const mockChannelWrapper = {
    addSetup: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const mockConnection = {
    createChannel: jest.fn().mockReturnValue(mockChannelWrapper),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return {
    connect: jest.fn().mockReturnValue(mockConnection),
  };
});

describe('MetricsConsumer', () => {
  let consumer: MetricsConsumer;

  const mockAlbumRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockSongRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeAll(() => {
    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterAll(() => {
    // Restore logger
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsConsumer,
        {
          provide: getRepositoryToken(AlbumMetric),
          useValue: mockAlbumRepository,
        },
        {
          provide: getRepositoryToken(SongMetric),
          useValue: mockSongRepository,
        },
        {
          provide: getRepositoryToken(UserMetric),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    consumer = module.get<MetricsConsumer>(MetricsConsumer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleSongMetric', () => {
    it('should increment song plays when song exists', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const existingSong = {
        songId,
        plays: 5,
        likes: 2,
        shares: 1,
      };

      mockSongRepository.findOne.mockResolvedValue(existingSong);
      mockSongRepository.save.mockResolvedValue({
        ...existingSong,
        plays: 6,
      });

      const eventData = {
        songId,
        metricType: 'play' as const,
        timestamp: new Date(),
      };

      await consumer.handleSongMetric(eventData);

      expect(mockSongRepository.findOne).toHaveBeenCalledWith({
        where: { songId },
      });
      expect(mockSongRepository.save).toHaveBeenCalledWith({
        ...existingSong,
        plays: 6,
      });
    });

    it('should increment song likes when song exists', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const existingSong = {
        songId,
        plays: 5,
        likes: 2,
        shares: 1,
      };

      mockSongRepository.findOne.mockResolvedValue(existingSong);
      mockSongRepository.save.mockResolvedValue({
        ...existingSong,
        likes: 3,
      });

      const eventData = {
        songId,
        metricType: 'like' as const,
        timestamp: new Date(),
      };

      await consumer.handleSongMetric(eventData);

      expect(mockSongRepository.save).toHaveBeenCalledWith({
        ...existingSong,
        likes: 3,
      });
    });

    it('should increment song shares when song exists', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const existingSong = {
        songId,
        plays: 5,
        likes: 2,
        shares: 1,
      };

      mockSongRepository.findOne.mockResolvedValue(existingSong);
      mockSongRepository.save.mockResolvedValue({
        ...existingSong,
        shares: 2,
      });

      const eventData = {
        songId,
        metricType: 'share' as const,
        timestamp: new Date(),
      };

      await consumer.handleSongMetric(eventData);

      expect(mockSongRepository.save).toHaveBeenCalledWith({
        ...existingSong,
        shares: 2,
      });
    });

    it('should skip processing when song does not exist', async () => {
      const songId = 'nonexistent-song-id';
      mockSongRepository.findOne.mockResolvedValue(null);

      const eventData = {
        songId,
        metricType: 'play' as const,
        timestamp: new Date(),
      };

      await consumer.handleSongMetric(eventData);

      expect(mockSongRepository.findOne).toHaveBeenCalledWith({
        where: { songId },
      });
      expect(mockSongRepository.save).not.toHaveBeenCalled();
    });

    it('should handle invalid metric type gracefully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const existingSong = {
        songId,
        plays: 5,
        likes: 2,
        shares: 1,
      };

      mockSongRepository.findOne.mockResolvedValue(existingSong);

      const eventData = {
        songId,
        metricType: 'invalid' as 'play',
        timestamp: new Date(),
      };

      await consumer.handleSongMetric(eventData);

      expect(mockSongRepository.findOne).toHaveBeenCalled();
      // Should not save anything for invalid metric type
      expect(mockSongRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('handleAlbumMetric', () => {
    it('should increment album likes when album exists', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const existingAlbum = {
        albumId,
        likes: 3,
        shares: 1,
      };

      mockAlbumRepository.findOne.mockResolvedValue(existingAlbum);
      mockAlbumRepository.save.mockResolvedValue({
        ...existingAlbum,
        likes: 4,
      });

      const eventData = {
        albumId,
        metricType: 'like' as const,
        timestamp: new Date(),
      };

      await consumer.handleAlbumMetric(eventData);

      expect(mockAlbumRepository.save).toHaveBeenCalledWith({
        ...existingAlbum,
        likes: 4,
      });
    });

    it('should create new album metric when album does not exist', async () => {
      const albumId = 'new-album-id';
      mockAlbumRepository.findOne.mockResolvedValue(null);

      const eventData = {
        albumId,
        metricType: 'like' as const,
        timestamp: new Date(),
      };

      await consumer.handleAlbumMetric(eventData);

      expect(mockAlbumRepository.save).toHaveBeenCalledWith({
        albumId,
        likes: 1,
        shares: 0,
      });
    });
  });

  describe('handleUserEvent', () => {
    it('should process user registration event', async () => {
      const eventData = {
        userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        eventType: UserEventType.REGISTRATION,
        metadata: { email: 'test@example.com' },
        timestamp: new Date(),
      };

      await consumer.handleUserEvent(eventData);

      // Should complete without error (currently just logs)
      expect(true).toBe(true);
    });

    it('should process user activity event', async () => {
      const eventData = {
        userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        eventType: UserEventType.ACTIVITY,
        timestamp: new Date(),
      };

      await consumer.handleUserEvent(eventData);

      // Should complete without error (currently just logs)
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors in song metrics', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockSongRepository.findOne.mockRejectedValue(new Error('Database error'));

      const eventData = {
        songId,
        metricType: 'play' as const,
        timestamp: new Date(),
      };

      await expect(consumer.handleSongMetric(eventData)).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle database errors in album metrics', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockAlbumRepository.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      const eventData = {
        albumId,
        metricType: 'like' as const,
        timestamp: new Date(),
      };

      await expect(consumer.handleAlbumMetric(eventData)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
