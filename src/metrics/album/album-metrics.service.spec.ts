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
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return top albums sorted by total plays', async () => {
      const mockAlbums = [
        { albumId: 'album1', likes: 10, shares: 5 },
        { albumId: 'album2', likes: 8, shares: 3 },
      ];
      const mockSongs = [
        { songId: 'song1', plays: 100 },
        { songId: 'song2', plays: 50 },
        { songId: 'song3', plays: 75 },
      ];
      const songIdsByAlbum = {
        album1: ['song1', 'song2'],
        album2: ['song3'],
      };

      // Reset the mock to avoid interference from previous tests
      jest.clearAllMocks();

      mockAlbumModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAlbums),
      });

      // Mock song queries for each album
      mockSongMetricModel.find
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([mockSongs[0], mockSongs[1]]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([mockSongs[2]]),
        });

      const result = await service.getTopAlbums(10, songIdsByAlbum);

      expect(result).toEqual([
        { albumId: 'album1', plays: 150, likes: 10, shares: 5 },
        { albumId: 'album2', plays: 75, likes: 8, shares: 3 },
      ]);
    });

    it('should handle albums with no songs', async () => {
      const mockAlbums = [
        { albumId: 'album1', likes: 10, shares: 5 },
        { albumId: 'album2', likes: 8, shares: 3 },
      ];
      const songIdsByAlbum = {
        album1: [],
        album2: [],
      };

      jest.clearAllMocks();
      mockAlbumModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAlbums),
      });

      const result = await service.getTopAlbums(10, songIdsByAlbum);

      expect(result).toEqual([
        { albumId: 'album1', plays: 0, likes: 10, shares: 5 },
        { albumId: 'album2', plays: 0, likes: 8, shares: 3 },
      ]);
      expect(mockSongMetricModel.find).not.toHaveBeenCalled();
    });

    it('should handle albums not in the mapping', async () => {
      const mockAlbums = [{ albumId: 'album1', likes: 10, shares: 5 }];
      const songIdsByAlbum = {};

      jest.clearAllMocks();
      mockAlbumModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAlbums),
      });

      const result = await service.getTopAlbums(10, songIdsByAlbum);

      expect(result).toEqual([
        { albumId: 'album1', plays: 0, likes: 10, shares: 5 },
      ]);
    });

    it('should limit results correctly', async () => {
      const mockAlbums = [
        { albumId: 'album1', likes: 10, shares: 5 },
        { albumId: 'album2', likes: 8, shares: 3 },
        { albumId: 'album3', likes: 6, shares: 2 },
      ];
      const songIdsByAlbum = {
        album1: ['song1'],
        album2: ['song2'],
        album3: ['song3'],
      };

      jest.clearAllMocks();
      mockAlbumModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAlbums),
      });

      mockSongMetricModel.find
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([{ songId: 'song1', plays: 100 }]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([{ songId: 'song2', plays: 75 }]),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([{ songId: 'song3', plays: 50 }]),
        });

      const result = await service.getTopAlbums(2, songIdsByAlbum);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        albumId: 'album1',
        plays: 100,
        likes: 10,
        shares: 5,
      });
      expect(result[1]).toEqual({
        albumId: 'album2',
        plays: 75,
        likes: 8,
        shares: 3,
      });
    });

    it('should use default limit when none provided', async () => {
      const mockAlbums = [];
      const songIdsByAlbum = {};

      jest.clearAllMocks();
      mockAlbumModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAlbums),
      });

      await service.getTopAlbums(undefined, songIdsByAlbum);

      // The method should work with default limit of 10
      expect(mockAlbumModel.find).toHaveBeenCalledWith({});
    });
  });
});
