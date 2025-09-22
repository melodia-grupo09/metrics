import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { AlbumMetric } from './entities/album-metric.entity';
import { SongAlbum } from './entities/song-album.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MetricsService', () => {
  let service: MetricsService;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRabbitClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: getRepositoryToken(AlbumMetric),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(SongAlbum),
          useValue: mockRepository,
        },
        {
          provide: 'METRICS_SERVICE',
          useValue: mockRabbitClient,
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAlbum', () => {
    it('should create an album successfully', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({ albumId, likes: 0, shares: 0 });

      const result = await service.createAlbum(albumId);

      expect(result).toEqual({
        message: 'Album created successfully',
        albumId,
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { albumId },
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if album already exists', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue({ albumId });

      await expect(service.createAlbum(albumId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { albumId },
      });
    });
  });

  describe('incrementAlbumLikes', () => {
    it('should increment album likes successfully', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue({ albumId });

      const result = await service.incrementAlbumLikes(albumId);

      expect(result).toEqual({ message: 'Album like recorded' });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { albumId },
      });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.album', {
        albumId,
        metricType: 'like',
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should throw NotFoundException if album does not exist', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.incrementAlbumLikes(albumId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('incrementAlbumShares', () => {
    it('should increment album shares successfully', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue({ albumId });

      const result = await service.incrementAlbumShares(albumId);

      expect(result).toEqual({ message: 'Album share recorded' });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { albumId },
      });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.album', {
        albumId,
        metricType: 'share',
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should throw NotFoundException if album does not exist', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.incrementAlbumShares(albumId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAlbumMetrics', () => {
    it('should get album metrics successfully', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const albumMetric = {
        albumId,
        likes: 10,
        shares: 5,
      };
      mockRepository.findOne.mockResolvedValue(albumMetric);

      const result = await service.getAlbumMetrics(albumId);

      expect(result).toEqual({
        albumId,
        likes: 10,
        shares: 5,
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { albumId },
      });
    });

    it('should throw NotFoundException if album does not exist', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getAlbumMetrics(albumId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
