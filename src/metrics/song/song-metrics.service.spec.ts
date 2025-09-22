import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SongMetricsService } from './song-metrics.service';
import { SongMetric } from '../entities/song-metric.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SongMetricsService', () => {
  let service: SongMetricsService;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
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
          provide: getRepositoryToken(SongMetric),
          useValue: mockRepository,
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
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { songId },
      });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.song', {
        songId,
        metricType: 'play',
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.incrementSongPlays(songId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('incrementSongLikes', () => {
    it('should increment song likes successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue({ songId });

      const result = await service.incrementSongLikes(songId);

      expect(result).toEqual({ message: 'Song like recorded' });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { songId },
      });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.song', {
        songId,
        metricType: 'like',
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.incrementSongLikes(songId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('incrementSongShares', () => {
    it('should increment song shares successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue({ songId });

      const result = await service.incrementSongShares(songId);

      expect(result).toEqual({ message: 'Song share recorded' });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { songId },
      });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.song', {
        songId,
        metricType: 'share',
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue(null);

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
      mockRepository.findOne.mockResolvedValue(songMetric);

      const result = await service.getSongMetrics(songId);

      expect(result).toEqual({
        songId,
        plays: 100,
        likes: 50,
        shares: 25,
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { songId },
      });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getSongMetrics(songId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
