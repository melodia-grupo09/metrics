import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SongMetricsService } from './song-metrics.service';
import { SongMetric } from '../entities/song-metric.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock amqp-connection-manager
const mockRabbitMQ = jest.fn();
const mockAddSetup = jest.fn(() => Promise.resolve());

jest.mock('amqp-connection-manager', () => ({
  connect: jest.fn(() => ({
    createChannel: jest.fn(() => ({
      addSetup: mockAddSetup,
      publish: mockRabbitMQ,
    })),
  })),
}));

describe('SongMetricsService', () => {
  let service: SongMetricsService;
  let mockSongMetricModel: any;

  beforeEach(async () => {
    mockRabbitMQ.mockClear();
    mockAddSetup.mockClear();

    mockSongMetricModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
      find: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
    };

    const MockSongMetric = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue(dto),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongMetricsService,
        {
          provide: getModelToken(SongMetric.name),
          useValue: Object.assign(MockSongMetric, mockSongMetricModel),
        },
      ],
    }).compile();

    service = module.get<SongMetricsService>(SongMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSong', () => {
    it('should create a song successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockSongMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.createSong(songId);

      expect(result).toEqual({
        message: 'Song created successfully',
        songId,
      });
      expect(mockSongMetricModel.findOne).toHaveBeenCalledWith({ songId });
    });

    it('should throw BadRequestException if song already exists', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockSongMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ songId }),
      });

      await expect(service.createSong(songId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSongMetricModel.findOne).toHaveBeenCalledWith({ songId });
    });
  });

  describe('incrementSongPlays', () => {
    it('should increment song plays successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockSongMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ songId }),
      });

      const result = await service.incrementSongPlays(songId);

      expect(result).toEqual({ message: 'Song play recorded' });
      expect(mockSongMetricModel.findOne).toHaveBeenCalledWith({ songId });
      expect(mockRabbitMQ).toHaveBeenCalledTimes(1);
      expect(mockRabbitMQ).toHaveBeenCalledWith(
        'metrics_exchange',
        'metrics.song.play',
        expect.any(Buffer),
      );
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockSongMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.incrementSongPlays(songId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRabbitMQ).not.toHaveBeenCalled();
    });
  });

  describe('incrementSongLikes', () => {
    it('should increment song likes successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockSongMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ songId }),
      });

      const result = await service.incrementSongLikes(songId);

      expect(result).toEqual({ message: 'Song like recorded' });
      expect(mockSongMetricModel.findOne).toHaveBeenCalledWith({ songId });
      expect(mockRabbitMQ).toHaveBeenCalledTimes(1);
      expect(mockRabbitMQ).toHaveBeenCalledWith(
        'metrics_exchange',
        'metrics.song.like',
        expect.any(Buffer),
      );
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockSongMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.incrementSongLikes(songId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRabbitMQ).not.toHaveBeenCalled();
    });
  });

  describe('incrementSongShares', () => {
    it('should increment song shares successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockSongMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ songId }),
      });

      const result = await service.incrementSongShares(songId);

      expect(result).toEqual({ message: 'Song share recorded' });
      expect(mockSongMetricModel.findOne).toHaveBeenCalledWith({ songId });
      expect(mockRabbitMQ).toHaveBeenCalledTimes(1);
      expect(mockRabbitMQ).toHaveBeenCalledWith(
        'metrics_exchange',
        'metrics.song.share',
        expect.any(Buffer),
      );
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockSongMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.incrementSongShares(songId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRabbitMQ).not.toHaveBeenCalled();
    });
  });

  describe('getSongMetrics', () => {
    it('should get song metrics successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const songMetric = {
        songId,
        plays: 100,
        likes: 50,
        shares: 25,
      };
      mockSongMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(songMetric),
      });

      const result = await service.getSongMetrics(songId);

      expect(result).toEqual({
        songId,
        plays: 100,
        likes: 50,
        shares: 25,
      });
      expect(mockSongMetricModel.findOne).toHaveBeenCalledWith({ songId });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockSongMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getSongMetrics(songId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
