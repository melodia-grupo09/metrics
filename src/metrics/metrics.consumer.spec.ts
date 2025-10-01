import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
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

  const createMockModel = () => {
    const model: any = function (dto: any) {
      this.data = dto;
      this.save = jest.fn().mockResolvedValue(this.data);
      this.likes = dto.likes || 0;
      this.shares = dto.shares || 0;
      this.plays = dto.plays || 0;
      return this;
    };
    model.findOne = jest.fn().mockReturnValue({
      exec: jest.fn(),
    });
    model.create = jest.fn();
    return model;
  };

  const mockAlbumModel = createMockModel();
  const mockSongModel = createMockModel();
  const mockUserModel = createMockModel();

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
          provide: getModelToken(AlbumMetric.name),
          useValue: mockAlbumModel,
        },
        {
          provide: getModelToken(SongMetric.name),
          useValue: mockSongModel,
        },
        {
          provide: getModelToken(UserMetric.name),
          useValue: mockUserModel,
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
        save: jest.fn().mockResolvedValue(true),
      };

      mockSongModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(existingSong),
      });

      const eventData = {
        songId,
        metricType: 'play' as const,
        timestamp: new Date(),
      };

      await consumer.handleSongMetric(eventData);

      expect(mockSongModel.findOne).toHaveBeenCalledWith({ songId });
      expect(existingSong.plays).toBe(6);
      expect(existingSong.save).toHaveBeenCalled();
    });

    it('should increment song likes when song exists', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const existingSong = {
        songId,
        plays: 5,
        likes: 2,
        shares: 1,
        save: jest.fn().mockResolvedValue(true),
      };

      mockSongModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(existingSong),
      });

      const eventData = {
        songId,
        metricType: 'like' as const,
        timestamp: new Date(),
      };

      await consumer.handleSongMetric(eventData);

      expect(existingSong.likes).toBe(3);
      expect(existingSong.save).toHaveBeenCalled();
    });

    it('should increment song shares when song exists', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const existingSong = {
        songId,
        plays: 5,
        likes: 2,
        shares: 1,
        save: jest.fn().mockResolvedValue(true),
      };

      mockSongModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(existingSong),
      });

      const eventData = {
        songId,
        metricType: 'share' as const,
        timestamp: new Date(),
      };

      await consumer.handleSongMetric(eventData);

      expect(existingSong.shares).toBe(2);
      expect(existingSong.save).toHaveBeenCalled();
    });

    it('should skip processing when song does not exist', async () => {
      const songId = 'nonexistent-song-id';
      mockSongModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      const eventData = {
        songId,
        metricType: 'play' as const,
        timestamp: new Date(),
      };

      await consumer.handleSongMetric(eventData);

      expect(mockSongModel.findOne).toHaveBeenCalledWith({ songId });
    });

    it('should handle invalid metric type gracefully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const existingSong = {
        songId,
        plays: 5,
        likes: 2,
        shares: 1,
        save: jest.fn().mockResolvedValue(true),
      };

      mockSongModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(existingSong),
      });

      const eventData = {
        songId,
        metricType: 'invalid' as 'play',
        timestamp: new Date(),
      };

      await consumer.handleSongMetric(eventData);

      expect(mockSongModel.findOne).toHaveBeenCalled();
      // Should not save anything for invalid metric type
      expect(existingSong.save).not.toHaveBeenCalled();
    });
  });

  describe('handleAlbumMetric', () => {
    it('should increment album likes when album exists', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const existingAlbum = {
        albumId,
        likes: 3,
        shares: 1,
        save: jest.fn().mockResolvedValue(true),
      };

      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(existingAlbum),
      });

      const eventData = {
        albumId,
        metricType: 'like' as const,
        timestamp: new Date(),
      };

      await consumer.handleAlbumMetric(eventData);

      expect(existingAlbum.likes).toBe(4);
      expect(existingAlbum.save).toHaveBeenCalled();
    });

    it('should create new album metric when album does not exist', async () => {
      const albumId = 'new-album-id';
      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      const eventData = {
        albumId,
        metricType: 'like' as const,
        timestamp: new Date(),
      };

      await consumer.handleAlbumMetric(eventData);

      expect(mockAlbumModel.findOne).toHaveBeenCalledWith({ albumId });
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

      // Should complete without error
      expect(true).toBe(true);
    });

    it('should process user activity event', async () => {
      const eventData = {
        userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        eventType: UserEventType.ACTIVITY,
        timestamp: new Date(),
      };

      await consumer.handleUserEvent(eventData);

      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors in song metrics', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockSongModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

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
      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

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
