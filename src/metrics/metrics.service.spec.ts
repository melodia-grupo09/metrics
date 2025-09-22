import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { SongMetric } from './entities/song-metric.entity';
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
  };

  const mockRabbitClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: getRepositoryToken(SongMetric),
          useValue: mockRepository,
        },
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

  describe('createSong', () => {
    it('should create a new song successfully', async () => {
      const songId = 'song123';
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
      const songId = 'song123';
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
      const songId = 'song123';
      mockRepository.findOne.mockResolvedValue({ songId });

      const result = await service.incrementSongPlays(songId);

      expect(result).toEqual({ message: 'Song play recorded' });
      expect(mockRabbitClient.emit).toHaveBeenCalledWith('metrics.song', {
        songId,
        metricType: 'play',
        timestamp: expect.any(Date) as Date,
      });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'nonexistent';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.incrementSongPlays(songId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSongMetrics', () => {
    it('should return song metrics successfully', async () => {
      const songId = 'song123';
      const mockMetrics = {
        songId,
        plays: 10,
        likes: 5,
        shares: 2,
      };
      mockRepository.findOne.mockResolvedValue(mockMetrics);

      const result = await service.getSongMetrics(songId);

      expect(result).toEqual({
        songId,
        plays: 10,
        likes: 5,
        shares: 2,
      });
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'nonexistent';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getSongMetrics(songId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createAlbum', () => {
    it('should create a new album successfully', async () => {
      const albumId = 'album123';
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({
        albumId,
        likes: 0,
        shares: 0,
      });

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
      const albumId = 'album123';
      mockRepository.findOne.mockResolvedValue({ albumId });

      await expect(service.createAlbum(albumId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addSongToAlbum', () => {
    it('should add song to album successfully', async () => {
      const songId = 'song123';
      const albumId = 'album123';

      // Mock song exists, album exists, no existing relation
      mockRepository.findOne
        .mockResolvedValueOnce({ songId }) // songExists check
        .mockResolvedValueOnce({ albumId }) // albumExists check (metric)
        .mockResolvedValueOnce(null) // albumExists check (relation)
        .mockResolvedValueOnce(null); // existing relation check

      mockRepository.save.mockResolvedValue({});

      const result = await service.addSongToAlbum(songId, albumId);

      expect(result).toEqual({
        message: 'Song added to album successfully',
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if song does not exist', async () => {
      const songId = 'nonexistent';
      const albumId = 'album123';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.addSongToAlbum(songId, albumId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if song is already in album', async () => {
      const songId = 'song123';
      const albumId = 'album123';

      // Mock song exists, album exists, but relation already exists
      mockRepository.findOne
        .mockResolvedValueOnce({ songId }) // songExists check
        .mockResolvedValueOnce({ albumId }) // albumExists check (metric)
        .mockResolvedValueOnce(null) // albumExists check (relation)
        .mockResolvedValueOnce({ songId, albumId }); // existing relation check

      await expect(service.addSongToAlbum(songId, albumId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
