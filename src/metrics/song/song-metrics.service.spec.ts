import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SongMetricsService } from './song-metrics.service';
import { SongMetric } from '../entities/song-metric.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SongMetricsService', () => {
  let service: SongMetricsService;

  const mockSongMetricModel = function (dto: any) {
    this.data = dto;
    this.save = jest.fn().mockResolvedValue(this.data);
  };

  const mockModel = {
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn(),
    }),
    create: jest.fn(),
  };

  const mockRabbitClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SongMetricsService,
        {
          provide: getModelToken(SongMetric.name),
          useValue: Object.assign(mockSongMetricModel, mockModel),
        },
        {
          provide: 'METRICS_SERVICE',
          useValue: mockRabbitClient,
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
      mockModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.createSong(songId);

      expect(result).toEqual({
        message: 'Song created successfully',
        songId,
      });
      expect(mockModel.findOne).toHaveBeenCalledWith({ songId });
    });

    it('should throw BadRequestException if song already exists', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ songId }),
      });

      await expect(service.createSong(songId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockModel.findOne).toHaveBeenCalledWith({ songId });
    });
  });

  describe('incrementSongPlays', () => {
    it('should increment song plays successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ songId }),
      });

      const result = await service.incrementSongPlays(songId);

      expect(result).toEqual({ message: 'Song play recorded' });
      expect(mockModel.findOne).toHaveBeenCalledWith({ songId });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.song.play', {
        songId,
        metricType: 'play',
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.incrementSongPlays(songId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('incrementSongLikes', () => {
    it('should increment song likes successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ songId }),
      });

      const result = await service.incrementSongLikes(songId);

      expect(result).toEqual({ message: 'Song like recorded' });
      expect(mockModel.findOne).toHaveBeenCalledWith({ songId });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.song.like', {
        songId,
        metricType: 'like',
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.incrementSongLikes(songId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('incrementSongShares', () => {
    it('should increment song shares successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ songId }),
      });

      const result = await service.incrementSongShares(songId);

      expect(result).toEqual({ message: 'Song share recorded' });
      expect(mockModel.findOne).toHaveBeenCalledWith({ songId });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.song.share', {
        songId,
        metricType: 'share',
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.incrementSongShares(songId)).rejects.toThrow(
        NotFoundException,
      );
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
      mockModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(songMetric),
      });

      const result = await service.getSongMetrics(songId);

      expect(result).toEqual({
        songId,
        plays: 100,
        likes: 50,
        shares: 25,
      });
      expect(mockModel.findOne).toHaveBeenCalledWith({ songId });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getSongMetrics(songId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
