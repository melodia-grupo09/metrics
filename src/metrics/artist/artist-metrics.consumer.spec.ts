import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
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
      } as any;

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
      } as any;

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
      } as any;

      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      (consumer as any).channelWrapper = {
        ack: jest.fn(),
      };

      await consumer.handleArtistMetric(mockMessage);

      expect((consumer as any).channelWrapper.ack).toHaveBeenCalled();
    });
  });
});
