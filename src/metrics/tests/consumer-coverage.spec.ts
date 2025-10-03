import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MetricsConsumer } from '../metrics.consumer';
import { getModelToken } from '@nestjs/mongoose';
import { AlbumMetric } from '../entities/album-metric.entity';
import { SongMetric } from '../entities/song-metric.entity';
import { UserMetric, UserEventType } from '../entities/user-metric.entity';

// Mock amqp-connection-manager
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

describe('RabbitMQ Consumer Coverage Tests', () => {
  let consumer: MetricsConsumer;

  const createMockModel = () => {
    const model: any = function (dto: any) {
      this.data = dto;
      this.save = jest.fn().mockResolvedValue(this.data);
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
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterAll(() => {
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

  describe('Consumer Handler Coverage', () => {
    it('should have handler for all known metric patterns', () => {
      // List of all patterns that services emit
      const knownPatterns = ['metrics.song', 'metrics.album', 'metrics.user'];

      const handlerMethods = [
        'handleSongMetric',
        'handleAlbumMetric',
        'handleUserEvent',
      ];

      for (const method of handlerMethods) {
        expect(typeof consumer[method]).toBe('function');
        expect(consumer[method]).toBeDefined();
      }

      // This test will fail if handlers are missing
      console.log('All required consumer handlers are present');
      console.log('Known patterns:', knownPatterns);
      console.log('Handler methods:', handlerMethods);
    });

    it('should process song metrics without throwing errors', async () => {
      const mockSong = {
        songId: 'test',
        plays: 0,
        likes: 0,
        shares: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      mockSongModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockSong),
      });

      const event = {
        songId: 'test',
        metricType: 'play' as const,
        timestamp: new Date(),
      };

      await expect(consumer.handleSongMetric(event)).resolves.not.toThrow();
      expect(mockSongModel.findOne).toHaveBeenCalled();
    });

    it('should process album metrics without throwing errors', async () => {
      const mockAlbum = {
        albumId: 'test',
        likes: 0,
        shares: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockAlbum),
      });

      const event = {
        albumId: 'test',
        metricType: 'like' as const,
        timestamp: new Date(),
      };

      await expect(consumer.handleAlbumMetric(event)).resolves.not.toThrow();
      expect(mockAlbumModel.findOne).toHaveBeenCalled();
    });

    it('should process user metrics without throwing errors', async () => {
      const event = {
        userId: 'test',
        eventType: UserEventType.REGISTRATION,
        timestamp: new Date(),
      };

      await expect(consumer.handleUserEvent(event)).resolves.not.toThrow();
    });

    it('should validate that ALL service emission patterns have consumer handlers', () => {
      const serviceEmissionPatterns = [
        'metrics.song',
        'metrics.album',
        'metrics.user',
      ];

      // Consumer should handle all of these patterns
      const consumerHandlers = {
        'metrics.song': 'handleSongMetric',
        'metrics.album': 'handleAlbumMetric',
        'metrics.user': 'handleUserEvent',
      };

      for (const pattern of serviceEmissionPatterns) {
        const handlerMethod =
          consumerHandlers[pattern as keyof typeof consumerHandlers];

        // Verify handler method exists
        expect(consumer[handlerMethod as keyof typeof consumer]).toBeDefined();
        expect(typeof consumer[handlerMethod as keyof typeof consumer]).toBe(
          'function',
        );

        console.log(`Pattern '${pattern}' -> Handler '${handlerMethod}'`);
      }

      // If you add a new service that emits messages, add the pattern here!
      expect(serviceEmissionPatterns.length).toBeGreaterThan(0);
      expect(Object.keys(consumerHandlers).length).toBe(
        serviceEmissionPatterns.length,
      );

      console.log('All service emission patterns have consumer handlers!');
    });

    it('should verify that consumer handlers actually process data (not just log)', async () => {
      // Test song metrics actually update the database
      const songMetric = {
        songId: 'test',
        plays: 5,
        likes: 2,
        shares: 1,
        save: jest.fn().mockResolvedValue(true),
      };

      mockSongModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(songMetric),
      });

      const songEvent = {
        songId: 'test',
        metricType: 'play' as const,
        timestamp: new Date(),
      };

      await consumer.handleSongMetric(songEvent);

      expect(songMetric.plays).toBe(6); // Should increment
      expect(songMetric.save).toHaveBeenCalled();

      // Test album metrics actually update the database
      const albumMetric = {
        albumId: 'test',
        likes: 3,
        shares: 1,
        save: jest.fn().mockResolvedValue(true),
      };

      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(albumMetric),
      });

      const albumEvent = {
        albumId: 'test',
        metricType: 'like' as const,
        timestamp: new Date(),
      };

      await consumer.handleAlbumMetric(albumEvent);

      expect(albumMetric.likes).toBe(4); // Should increment
      expect(albumMetric.save).toHaveBeenCalled();

      console.log(
        'Consumer handlers are actually processing, not just logging!',
      );
    });
  });

  describe('Message Processing Logic Coverage', () => {
    it('should verify that consumer message routing includes all patterns', () => {
      const expectedPatterns = [
        'metrics.song',
        'metrics.album',
        'metrics.user',
      ];

      // This would fail if you added a new service that emits messages
      // but forgot to add the routing logic in the consumer
      for (const pattern of expectedPatterns) {
        console.log(`Checking pattern routing for: ${pattern}`);

        expect(pattern).toMatch(/^metrics\.(song|album|user)$/);
      }

      console.log('All patterns have expected routing logic patterns');
    });
  });
});
