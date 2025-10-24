import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AlbumMetricsService } from './album-metrics.service';
import { AlbumMetric } from '../entities/album-metric.entity';
import { SongMetric } from '../entities/song-metric.entity';

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

describe('AlbumMetricsService', () => {
  let service: AlbumMetricsService;

  const mockAlbumMetricModel = function (dto: any) {
    this.data = dto;
    this.save = jest.fn().mockResolvedValue(this.data);
  };

  const mockAlbumModel = {
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

  const mockSongMetricModel = {
    find: jest.fn().mockReturnValue({
      exec: jest.fn(),
    }),
  };

  beforeEach(async () => {
    mockRabbitMQ.mockClear();
    mockAddSetup.mockClear();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumMetricsService,
        {
          provide: getModelToken(AlbumMetric.name),
          useValue: Object.assign(mockAlbumMetricModel, mockAlbumModel),
        },
        {
          provide: getModelToken(SongMetric.name),
          useValue: mockSongMetricModel,
        },
      ],
    }).compile();

    service = module.get<AlbumMetricsService>(AlbumMetricsService);
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
      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.createAlbum(albumId);

      expect(result).toEqual({
        message: 'Album created successfully',
        albumId,
      });
      expect(mockAlbumModel.findOne).toHaveBeenCalledWith({ albumId });
    });

    it('should throw BadRequestException if album already exists', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          id: 'some-id',
          albumId,
          likes: 0,
          shares: 0,
        }),
      });

      await expect(service.createAlbum(albumId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAlbumModel.findOne).toHaveBeenCalledWith({ albumId });
    });
  });

  describe('incrementAlbumLikes', () => {
    it('should increment album likes successfully', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          id: 'some-id',
          albumId,
          likes: 5,
          shares: 2,
        }),
      });

      const result = await service.incrementAlbumLikes(albumId);

      expect(result).toEqual({ message: 'Album like recorded' });
      expect(mockRabbitMQ).toHaveBeenCalledTimes(1);
      expect(mockRabbitMQ).toHaveBeenCalledWith(
        'metrics_exchange',
        'metrics.album.like',
        expect.any(Buffer),
      );
    });

    it('should throw NotFoundException if album does not exist', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.incrementAlbumLikes(albumId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRabbitMQ).not.toHaveBeenCalled();
    });
  });

  describe('incrementAlbumShares', () => {
    it('should increment album shares successfully', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          id: 'some-id',
          albumId,
          likes: 5,
          shares: 2,
        }),
      });

      const result = await service.incrementAlbumShares(albumId);

      expect(result).toEqual({ message: 'Album share recorded' });
      expect(mockRabbitMQ).toHaveBeenCalledTimes(1);
      expect(mockRabbitMQ).toHaveBeenCalledWith(
        'metrics_exchange',
        'metrics.album.share',
        expect.any(Buffer),
      );
    });

    it('should throw NotFoundException if album does not exist', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.incrementAlbumShares(albumId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRabbitMQ).not.toHaveBeenCalled();
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

      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockMetrics),
      });

      const mockSongs = [
        { songId: 'song1-uuid', plays: 100 },
        { songId: 'song2-uuid', plays: 50 },
      ];

      mockSongMetricModel.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockSongs),
      });

      const result = await service.getAlbumMetrics(albumId, songIds);

      expect(result).toEqual({
        albumId,
        plays: 150,
        likes: 10,
        shares: 5,
      });
      expect(mockAlbumModel.findOne).toHaveBeenCalledWith({ albumId });
      expect(mockSongMetricModel.find).toHaveBeenCalledWith({
        songId: { $in: songIds },
      });
    });

    it('should return album metrics with 0 plays when no songIds provided', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      const mockMetrics = {
        id: 'some-id',
        albumId,
        likes: 10,
        shares: 5,
      };
      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockMetrics),
      });

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
      mockAlbumModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getAlbumMetrics(albumId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTopAlbums', () => {
    it('should return top albums sorted by likes', async () => {
      const mockAlbums = [
        { albumId: 'album1', likes: 100, shares: 25 },
        { albumId: 'album2', likes: 75, shares: 15 },
        { albumId: 'album3', likes: 50, shares: 10 },
      ];

      mockAlbumModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAlbums),
      });

      const result = await service.getTopAlbums(10);

      expect(result).toEqual([
        { albumId: 'album1', likes: 100, shares: 25 },
        { albumId: 'album2', likes: 75, shares: 15 },
        { albumId: 'album3', likes: 50, shares: 10 },
      ]);
      expect(mockAlbumModel.find).toHaveBeenCalledWith({});
    });

    it('should use default limit of 10 when no limit provided', async () => {
      const mockAlbums = [];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAlbums),
      };

      mockAlbumModel.find.mockReturnValue(mockQuery);

      await service.getTopAlbums();

      expect(mockAlbumModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.sort).toHaveBeenCalledWith({ likes: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should use custom limit when provided', async () => {
      const mockAlbums = [];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAlbums),
      };

      mockAlbumModel.find.mockReturnValue(mockQuery);

      await service.getTopAlbums(5);

      expect(mockAlbumModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.sort).toHaveBeenCalledWith({ likes: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('should return empty array when no albums found', async () => {
      mockAlbumModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getTopAlbums(10);

      expect(result).toEqual([]);
    });
  });

  describe('deleteAlbum', () => {
    it('should delete an album successfully', async () => {
      const albumId = 'album123';
      const mockAlbum = { albumId, likes: 10, shares: 5 };

      mockAlbumModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAlbum),
      });

      mockAlbumModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await service.deleteAlbum(albumId);

      expect(mockAlbumModel.findOne).toHaveBeenCalledWith({ albumId });
      expect(mockAlbumModel.deleteOne).toHaveBeenCalledWith({ albumId });
      expect(result).toEqual({ message: 'Album deleted successfully' });
    });

    it('should throw NotFoundException when album does not exist', async () => {
      const albumId = 'nonexistent-album';

      mockAlbumModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteAlbum(albumId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockAlbumModel.findOne).toHaveBeenCalledWith({ albumId });
      expect(mockAlbumModel.deleteOne).not.toHaveBeenCalled();
    });
  });
});
