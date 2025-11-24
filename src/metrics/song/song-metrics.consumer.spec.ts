import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { SongMetricsConsumer } from './song-metrics.consumer';
import { SongMetric } from '../entities/song-metric.entity';
import { UserLike } from '../entities/user-like.entity';
import { UserShare } from '../entities/user-share.entity';

// Mock amqp-connection-manager
jest.mock('amqp-connection-manager', () => {
  const mockChannelWrapper = {
    addSetup: jest.fn().mockResolvedValue(undefined),
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const mockConnection = {
    createChannel: jest.fn().mockReturnValue(mockChannelWrapper),
  };

  return {
    connect: jest.fn().mockReturnValue(mockConnection),
  };
});

describe('SongMetricsConsumer', () => {
  let consumer: SongMetricsConsumer;
  let mockSongModel: any;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    const createMockModel = () => {
      const model: any = jest.fn();
      model.findOne = jest.fn().mockReturnValue({
        exec: jest.fn(),
      });
      return model;
    };

    mockSongModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongMetricsConsumer,
        {
          provide: getModelToken(SongMetric.name),
          useValue: mockSongModel,
        },
        {
          provide: getModelToken(UserLike.name),
          useValue: mockSongModel,
        },
        {
          provide: getModelToken(SongMetric.name),
          useValue: mockSongModel,
        },
        {
          provide: getModelToken(UserLike.name),
          useValue: { create: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: getModelToken(UserShare.name),
          useValue: { create: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    consumer = module.get<SongMetricsConsumer>(SongMetricsConsumer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleSongMetric', () => {
    const createMockMessage = (content: any) =>
      ({
        content: Buffer.from(JSON.stringify(content)),
      }) as any;

    it('should increment song plays when processing play metric', async () => {
      const songId = 'test-song-id';
      const artistId = 'artist-123';
      const userId = 'user-456';
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

      const message = createMockMessage({
        songId,
        artistId,
        userId,
        metricType: 'play',
        timestamp: new Date(),
      });

      await consumer.handleSongMetric(message);

      expect(mockSongModel.findOne).toHaveBeenCalledWith({ songId });
      expect(existingSong.plays).toBe(6);
      expect(existingSong.save).toHaveBeenCalled();
    });

    it('should publish artist listener event when processing play', async () => {
      const songId = 'test-song-id';
      const artistId = 'artist-123';
      const userId = 'user-456';
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

      const mockChannelWrapper = {
        ack: jest.fn(),
        publish: jest.fn(),
      };
      (consumer as any).channelWrapper = mockChannelWrapper;

      const message = createMockMessage({
        songId,
        artistId,
        userId,
        metricType: 'play',
        timestamp: new Date(),
      });

      await consumer.handleSongMetric(message);

      expect(existingSong.plays).toBe(6);
      expect(existingSong.save).toHaveBeenCalled();
      expect(mockChannelWrapper.publish).toHaveBeenCalledWith(
        'metrics_exchange',
        'metrics.artist.listener',
        expect.any(Buffer),
      );

      const publishCall = mockChannelWrapper.publish.mock.calls[0];
      const publishedData = JSON.parse(publishCall[2].toString());
      expect(publishedData.artistId).toBe(artistId);
      expect(publishedData.userId).toBe(userId);
    });

    it('should increment song likes when processing like metric', async () => {
      const songId = 'test-song-id';
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

      const message = createMockMessage({
        songId,
        metricType: 'like',
        timestamp: new Date(),
      });

      await consumer.handleSongMetric(message);

      expect(mockSongModel.findOne).toHaveBeenCalledWith({ songId });
      expect(existingSong.likes).toBe(3);
      expect(existingSong.save).toHaveBeenCalled();
    });

    it('should increment song shares when processing share metric', async () => {
      const songId = 'test-song-id';
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

      const message = createMockMessage({
        songId,
        metricType: 'share',
        timestamp: new Date(),
      });

      await consumer.handleSongMetric(message);

      expect(mockSongModel.findOne).toHaveBeenCalledWith({ songId });
      expect(existingSong.shares).toBe(2);
      expect(existingSong.save).toHaveBeenCalled();
    });

    it('should skip processing when song does not exist', async () => {
      const songId = 'nonexistent-song-id';

      mockSongModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      const message = createMockMessage({
        songId,
        metricType: 'play',
        timestamp: new Date(),
      });

      await consumer.handleSongMetric(message);

      expect(mockSongModel.findOne).toHaveBeenCalledWith({ songId });
      // Should not save anything since song doesn't exist
    });

    it('should handle unknown metric types gracefully', async () => {
      const songId = 'test-song-id';
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

      const message = createMockMessage({
        songId,
        metricType: 'unknown',
        timestamp: new Date(),
      });

      await consumer.handleSongMetric(message);

      expect(mockSongModel.findOne).toHaveBeenCalledWith({ songId });
      expect(existingSong.save).not.toHaveBeenCalled();
      // Original values should remain unchanged
      expect(existingSong.plays).toBe(5);
      expect(existingSong.likes).toBe(2);
      expect(existingSong.shares).toBe(1);
    });

    it('should handle processing errors gracefully', async () => {
      const songId = 'test-song-id';

      mockSongModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const message = createMockMessage({
        songId,
        metricType: 'play',
        timestamp: new Date(),
      });

      // Should not throw, but handle error internally
      await expect(consumer.handleSongMetric(message)).resolves.not.toThrow();
    });
  });

  describe('onModuleInit', () => {
    it('should initialize RabbitMQ setup correctly', async () => {
      const mockChannel = {
        assertExchange: jest.fn().mockResolvedValue(undefined),
        assertQueue: jest
          .fn()
          .mockResolvedValue({ queue: 'song_metrics_queue' }),
        bindQueue: jest.fn().mockResolvedValue(undefined),
        consume: jest.fn().mockResolvedValue(undefined),
      };

      const amqpMock = jest.requireMock('amqp-connection-manager');
      const mockChannelWrapper = amqpMock.connect().createChannel();

      mockChannelWrapper.addSetup.mockImplementation(async (setupFn: any) => {
        await setupFn(mockChannel);
      });

      await consumer.onModuleInit();

      expect(mockChannelWrapper.addSetup).toHaveBeenCalledTimes(1);
      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        'metrics_exchange',
        'topic',
        { durable: true },
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'song_metrics_queue',
        { durable: true },
      );
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(
        'song_metrics_queue',
        'metrics_exchange',
        'metrics.song.*',
      );
      expect(mockChannel.consume).toHaveBeenCalledTimes(1);
    });
  });
});
