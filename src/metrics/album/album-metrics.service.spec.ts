import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AlbumMetricsService } from './album-metrics.service';
import { AlbumMetric } from '../entities/album-metric.entity';
import { SongMetric } from '../entities/song-metric.entity';

describe('AlbumMetricsService', () => {
  let service: AlbumMetricsService;
  let albumMetricRepository: Repository<AlbumMetric>;
  let rabbitClient: ClientProxy;

  const mockAlbumMetricRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockSongMetricRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRabbitClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumMetricsService,
        {
          provide: getRepositoryToken(AlbumMetric),
          useValue: mockAlbumMetricRepository,
        },
        {
          provide: getRepositoryToken(SongMetric),
          useValue: mockSongMetricRepository,
        },
        {
          provide: 'METRICS_SERVICE',
          useValue: mockRabbitClient,
        },
      ],
    }).compile();

    service = module.get<AlbumMetricsService>(AlbumMetricsService);
    albumMetricRepository = module.get<Repository<AlbumMetric>>(
      getRepositoryToken(AlbumMetric),
    );
    rabbitClient = module.get<ClientProxy>('METRICS_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAlbum', () => {
    it('should create a new album successfully', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      mockAlbumMetricRepository.findOne.mockResolvedValue(null);
      mockAlbumMetricRepository.save.mockResolvedValue({
        id: 'some-id',
        albumId,
        likes: 0,
        shares: 0,
      });

      const result = await service.createAlbum(albumId);

      expect(result).toEqual({
        message: 'Album created successfully',
        albumId,
      });
      expect(albumMetricRepository.findOne).toHaveBeenCalledWith({
        where: { albumId },
      });
      expect(albumMetricRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if album already exists', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      mockAlbumMetricRepository.findOne.mockResolvedValue({
        id: 'some-id',
        albumId,
        likes: 0,
        shares: 0,
      });

      await expect(service.createAlbum(albumId)).rejects.toThrow(
        BadRequestException,
      );
      expect(albumMetricRepository.findOne).toHaveBeenCalledWith({
        where: { albumId },
      });
      expect(albumMetricRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('incrementAlbumLikes', () => {
    it('should increment album likes successfully', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      mockAlbumMetricRepository.findOne.mockResolvedValue({
        id: 'some-id',
        albumId,
        likes: 5,
        shares: 2,
      });

      const result = await service.incrementAlbumLikes(albumId);

      expect(result).toEqual({ message: 'Album like recorded' });
      expect(rabbitClient.emit).toHaveBeenCalledWith(
        'metrics.album.like',
        expect.objectContaining({
          albumId,
          metricType: 'like',
        }),
      );
    });

    it('should throw NotFoundException if album does not exist', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      mockAlbumMetricRepository.findOne.mockResolvedValue(null);

      await expect(service.incrementAlbumLikes(albumId)).rejects.toThrow(
        NotFoundException,
      );
      expect(rabbitClient.emit).not.toHaveBeenCalled();
    });
  });

  describe('incrementAlbumShares', () => {
    it('should increment album shares successfully', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      mockAlbumMetricRepository.findOne.mockResolvedValue({
        id: 'some-id',
        albumId,
        likes: 5,
        shares: 2,
      });

      const result = await service.incrementAlbumShares(albumId);

      expect(result).toEqual({ message: 'Album share recorded' });
      expect(rabbitClient.emit).toHaveBeenCalledWith(
        'metrics.album.share',
        expect.objectContaining({
          albumId,
          metricType: 'share',
        }),
      );
    });

    it('should throw NotFoundException if album does not exist', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      mockAlbumMetricRepository.findOne.mockResolvedValue(null);

      await expect(service.incrementAlbumShares(albumId)).rejects.toThrow(
        NotFoundException,
      );
      expect(rabbitClient.emit).not.toHaveBeenCalled();
    });
  });

  describe('getAlbumMetrics', () => {
    it('should return album metrics with calculated plays from songIds', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      const songIds = ['song1-uuid', 'song2-uuid'];
      const mockMetrics = {
        id: 'some-id',
        albumId,
        likes: 10,
        shares: 5,
      };

      mockAlbumMetricRepository.findOne.mockResolvedValue(mockMetrics);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '150' }),
      };
      mockSongMetricRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getAlbumMetrics(albumId, songIds);

      expect(result).toEqual({
        albumId,
        plays: 150,
        likes: 10,
        shares: 5,
      });
      expect(albumMetricRepository.findOne).toHaveBeenCalledWith({
        where: { albumId },
      });
      expect(mockSongMetricRepository.createQueryBuilder).toHaveBeenCalledWith(
        'song',
      );
    });

    it('should return album metrics with 0 plays when no songIds provided', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      const mockMetrics = {
        id: 'some-id',
        albumId,
        likes: 10,
        shares: 5,
      };
      mockAlbumMetricRepository.findOne.mockResolvedValue(mockMetrics);

      const result = await service.getAlbumMetrics(albumId);

      expect(result).toEqual({
        albumId,
        plays: 0,
        likes: 10,
        shares: 5,
      });
    });

    it('should throw NotFoundException if album does not exist', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      mockAlbumMetricRepository.findOne.mockResolvedValue(null);

      await expect(service.getAlbumMetrics(albumId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
