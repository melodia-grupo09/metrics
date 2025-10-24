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
      deleteOne: jest.fn().mockReturnValue({
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
      const artistId = 'artist-123';
      const userId = 'user-456';
      mockSongMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ songId }),
      });

      const result = await service.incrementSongPlays(songId, artistId, userId);

      expect(result).toEqual({ message: 'Song play recorded' });
      expect(mockSongMetricModel.findOne).toHaveBeenCalledWith({ songId });
      expect(mockRabbitMQ).toHaveBeenCalledTimes(1);

      const callArgs = mockRabbitMQ.mock.calls[0];
      const publishedData = JSON.parse(callArgs[2].toString() as string);
      expect(publishedData.songId).toBe(songId);
      expect(publishedData.artistId).toBe(artistId);
      expect(publishedData.userId).toBe(userId);
      expect(publishedData.metricType).toBe('play');
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const artistId = 'artist-123';
      const userId = 'user-456';
      mockSongMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.incrementSongPlays(songId, artistId, userId),
      ).rejects.toThrow(NotFoundException);
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

  describe('getTopSongs', () => {
    it('should return top songs sorted by plays', async () => {
      const mockSongs = [
        { songId: 'song1', plays: 100, likes: 50, shares: 25 },
        { songId: 'song2', plays: 90, likes: 40, shares: 20 },
        { songId: 'song3', plays: 80, likes: 30, shares: 15 },
      ];

      mockSongMetricModel.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSongs),
      });

      const result = await service.getTopSongs(10);

      expect(result).toEqual([
        { songId: 'song1', plays: 100, likes: 50, shares: 25 },
        { songId: 'song2', plays: 90, likes: 40, shares: 20 },
        { songId: 'song3', plays: 80, likes: 30, shares: 15 },
      ]);
      expect(mockSongMetricModel.find).toHaveBeenCalledWith({});
    });

    it('should use default limit of 10 when no limit provided', async () => {
      const mockSongs = [];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSongs),
      };

      mockSongMetricModel.find.mockReturnValueOnce(mockQuery);

      await service.getTopSongs();

      expect(mockSongMetricModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.sort).toHaveBeenCalledWith({ plays: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should use custom limit when provided', async () => {
      const mockSongs = [];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSongs),
      };

      mockSongMetricModel.find.mockReturnValueOnce(mockQuery);

      await service.getTopSongs(5);

      expect(mockSongMetricModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.sort).toHaveBeenCalledWith({ plays: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('should return empty array when no songs found', async () => {
      mockSongMetricModel.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getTopSongs(10);

      expect(result).toEqual([]);
    });
  });

  describe('deleteSong', () => {
    it('should delete a song successfully', async () => {
      const songId = 'song123';
      const mockSong = { songId, plays: 10, likes: 5, shares: 2 };

      mockSongMetricModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSong),
      });

      mockSongMetricModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await service.deleteSong(songId);

      expect(mockSongMetricModel.findOne).toHaveBeenCalledWith({ songId });
      expect(mockSongMetricModel.deleteOne).toHaveBeenCalledWith({ songId });
      expect(result).toEqual({ message: 'Song deleted successfully' });
    });

    it('should throw NotFoundException when song does not exist', async () => {
      const songId = 'nonexistent-song';

      mockSongMetricModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteSong(songId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockSongMetricModel.findOne).toHaveBeenCalledWith({ songId });
      expect(mockSongMetricModel.deleteOne).not.toHaveBeenCalled();
    });
  });
});
