import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConsumeMessage } from 'amqplib';
import { ArtistMetricsConsumer } from './artist-metrics.consumer';
import { ArtistMetric } from '../entities/artist-metric.entity';
import { Logger } from '@nestjs/common';

// Mock amqp-connection-manager
jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn(() => ({
    createChannel: jest.fn(() => ({
      addSetup: jest.fn(() => Promise.resolve()),
      ack: jest.fn(),
    })),
  })),
}));

describe('ArtistMetricsConsumer', () => {
  let consumer: ArtistMetricsConsumer;
  let mockModel: any;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    mockModel = {
      findOne: jest.fn(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtistMetricsConsumer,
        {
          provide: getModelToken(ArtistMetric.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    consumer = module.get<ArtistMetricsConsumer>(ArtistMetricsConsumer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('handleArtistMetric', () => {
    it('should add a new listener', async () => {
      const mockMessage = {
        content: Buffer.from(
          JSON.stringify({
            artistId: 'artist-123',
            userId: 'user-456',
            timestamp: new Date(),
          }),
        ),
        fields: { routingKey: 'metrics.artist.listener' },
      } as unknown as ConsumeMessage;

      const mockArtist = {
        artistId: 'artist-123',
        listeners: [],
        save: jest.fn().mockResolvedValue({}),
      };

      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockArtist),
      });

      (consumer as any).channelWrapper = {
        ack: jest.fn(),
      };

      await consumer.handleArtistMetric(mockMessage);

      expect(mockArtist.save).toHaveBeenCalled();
      expect(mockArtist.listeners).toHaveLength(1);
      expect((consumer as any).channelWrapper.ack).toHaveBeenCalled();
    });

    it('should not duplicate listener on same day', async () => {
      const now = new Date();
      const mockMessage = {
        content: Buffer.from(
          JSON.stringify({
            artistId: 'artist-123',
            userId: 'user-456',
            timestamp: now,
          }),
        ),
        fields: { routingKey: 'metrics.artist.listener' },
      } as unknown as ConsumeMessage;

      const mockArtist = {
        artistId: 'artist-123',
        listeners: [{ userId: 'user-456', timestamp: now }],
        save: jest.fn().mockResolvedValue({}),
      };

      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockArtist),
      });

      (consumer as any).channelWrapper = {
        ack: jest.fn(),
      };

      await consumer.handleArtistMetric(mockMessage);

      expect(mockArtist.save).not.toHaveBeenCalled();
      expect((consumer as any).channelWrapper.ack).toHaveBeenCalled();
    });

    it('should skip if artist not found', async () => {
      const mockMessage = {
        content: Buffer.from(
          JSON.stringify({
            artistId: 'artist-unknown',
            userId: 'user-456',
            timestamp: new Date(),
          }),
        ),
        fields: { routingKey: 'metrics.artist.listener' },
      } as unknown as ConsumeMessage;

      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      (consumer as any).channelWrapper = {
        ack: jest.fn(),
      };

      await consumer.handleArtistMetric(mockMessage);

      expect((consumer as any).channelWrapper.ack).toHaveBeenCalled();
    });

    it('should add a new follower', async () => {
      const mockMessage = {
        content: Buffer.from(
          JSON.stringify({
            artistId: 'artist-123',
            userId: 'user-456',
            timestamp: new Date(),
          }),
        ),
        fields: { routingKey: 'metrics.artist.follow' },
      } as unknown as ConsumeMessage;

      const mockArtist = {
        artistId: 'artist-123',
        followers: [],
        save: jest.fn().mockResolvedValue({}),
      };

      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockArtist),
      });

      (consumer as any).channelWrapper = {
        ack: jest.fn(),
      };

      // Mock fetch for getUserRegion
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ pais: 'Argentina' }),
      } as any);

      await consumer.handleArtistMetric(mockMessage);

      expect(mockArtist.save).toHaveBeenCalled();
      expect(mockArtist.followers).toHaveLength(1);
      expect(mockArtist.followers[0].userId).toBe('user-456');
      expect(mockArtist.followers[0].region).toBe('Argentina');
      expect((consumer as any).channelWrapper.ack).toHaveBeenCalled();
    });

    it('should not add duplicate follower', async () => {
      const mockMessage = {
        content: Buffer.from(
          JSON.stringify({
            artistId: 'artist-123',
            userId: 'user-456',
            timestamp: new Date(),
          }),
        ),
        fields: { routingKey: 'metrics.artist.follow' },
      } as unknown as ConsumeMessage;

      const mockArtist = {
        artistId: 'artist-123',
        followers: [{ userId: 'user-456' }],
        save: jest.fn().mockResolvedValue({}),
      };

      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockArtist),
      });

      (consumer as any).channelWrapper = {
        ack: jest.fn(),
      };

      await consumer.handleArtistMetric(mockMessage);

      expect(mockArtist.save).not.toHaveBeenCalled();
      expect(mockArtist.followers).toHaveLength(1);
      expect((consumer as any).channelWrapper.ack).toHaveBeenCalled();
    });

    it('should remove a follower', async () => {
      const mockMessage = {
        content: Buffer.from(
          JSON.stringify({
            artistId: 'artist-123',
            userId: 'user-456',
            timestamp: new Date(),
          }),
        ),
        fields: { routingKey: 'metrics.artist.unfollow' },
      } as unknown as ConsumeMessage;

      const mockArtist = {
        artistId: 'artist-123',
        followers: [{ userId: 'user-456' }],
        save: jest.fn().mockResolvedValue({}),
      };

      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockArtist),
      });

      (consumer as any).channelWrapper = {
        ack: jest.fn(),
      };

      await consumer.handleArtistMetric(mockMessage);

      expect(mockArtist.save).toHaveBeenCalled();
      expect(mockArtist.followers).toHaveLength(0);
      expect((consumer as any).channelWrapper.ack).toHaveBeenCalled();
    });

    it('should handle fetch error in getUserRegion', async () => {
      const mockMessage = {
        content: Buffer.from(
          JSON.stringify({
            artistId: 'artist-123',
            userId: 'user-456',
            timestamp: new Date(),
          }),
        ),
        fields: { routingKey: 'metrics.artist.follow' },
      } as unknown as ConsumeMessage;

      const mockArtist = {
        artistId: 'artist-123',
        followers: [],
        save: jest.fn().mockResolvedValue({}),
      };

      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockArtist),
      });

      (consumer as any).channelWrapper = {
        ack: jest.fn(),
      };

      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await consumer.handleArtistMetric(mockMessage);

      expect(mockArtist.save).toHaveBeenCalled();
      expect(mockArtist.followers[0].region).toBe('Unknown');
    });
    it('should handle processing error', async () => {
      const mockMessage = {
        content: Buffer.from('invalid-json'),
        fields: { routingKey: 'metrics.artist.listener' },
      } as unknown as ConsumeMessage;

      await consumer.handleArtistMetric(mockMessage);

      // Should catch error and log it, not throw
      // Since we mocked Logger, we can't check if it was logged unless we spy on it
      // But execution should complete without error
    });
  });

  describe('onModuleInit', () => {
    it('should setup RabbitMQ', async () => {
      const mockChannel = {
        assertExchange: jest.fn(),
        assertQueue: jest
          .fn()
          .mockResolvedValue({ queue: 'artist_metrics_queue' }),
        bindQueue: jest.fn(),
        consume: jest.fn(),
      };

      // We need to access the setup function passed to addSetup
      let setupCallback: any;
      (consumer as any).channelWrapper.addSetup = jest.fn((cb) => {
        setupCallback = cb;
        return Promise.resolve();
      });

      await consumer.onModuleInit();

      expect((consumer as any).channelWrapper.addSetup).toHaveBeenCalled();

      // Execute the callback to test the channel setup logic
      if (setupCallback) {
        await setupCallback(mockChannel);
        expect(mockChannel.assertExchange).toHaveBeenCalledWith(
          'metrics_exchange',
          'topic',
          { durable: true },
        );
        expect(mockChannel.assertQueue).toHaveBeenCalledWith(
          'artist_metrics_queue',
          { durable: true },
        );
        expect(mockChannel.bindQueue).toHaveBeenCalledWith(
          'artist_metrics_queue',
          'metrics_exchange',
          'metrics.artist.*',
        );
        expect(mockChannel.consume).toHaveBeenCalled();
      }
    });
  });
});
