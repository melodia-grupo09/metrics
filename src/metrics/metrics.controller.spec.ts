import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;

  const mockMetricsService = {
    createSong: jest.fn(),
    incrementSongPlays: jest.fn(),
    incrementSongLikes: jest.fn(),
    incrementSongShares: jest.fn(),
    getSongMetrics: jest.fn(),
    createAlbum: jest.fn(),
    incrementAlbumLikes: jest.fn(),
    incrementAlbumShares: jest.fn(),
    getAlbumMetrics: jest.fn(),
    addSongToAlbum: jest.fn(),
    removeSongFromAlbum: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSong', () => {
    it('should create a song successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = { message: 'Song created successfully', songId };
      mockMetricsService.createSong.mockResolvedValue(result);

      expect(await controller.createSong(songId)).toBe(result);
      expect(mockMetricsService.createSong).toHaveBeenCalledWith(songId);
    });
  });

  describe('incrementSongPlays', () => {
    it('should increment song plays successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = { message: 'Song play recorded' };
      mockMetricsService.incrementSongPlays.mockResolvedValue(result);

      expect(await controller.incrementSongPlays(songId)).toBe(result);
      expect(mockMetricsService.incrementSongPlays).toHaveBeenCalledWith(
        songId,
      );
    });
  });

  describe('incrementSongLikes', () => {
    it('should increment song likes successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = { message: 'Song like recorded' };
      mockMetricsService.incrementSongLikes.mockResolvedValue(result);

      expect(await controller.incrementSongLikes(songId)).toBe(result);
      expect(mockMetricsService.incrementSongLikes).toHaveBeenCalledWith(
        songId,
      );
    });
  });

  describe('incrementSongShares', () => {
    it('should increment song shares successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = { message: 'Song share recorded' };
      mockMetricsService.incrementSongShares.mockResolvedValue(result);

      expect(await controller.incrementSongShares(songId)).toBe(result);
      expect(mockMetricsService.incrementSongShares).toHaveBeenCalledWith(
        songId,
      );
    });
  });

  describe('getSongMetrics', () => {
    it('should get song metrics successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = {
        songId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        plays: 10,
        likes: 5,
        shares: 2,
      };
      mockMetricsService.getSongMetrics.mockResolvedValue(result);

      expect(await controller.getSongMetrics(songId)).toBe(result);
      expect(mockMetricsService.getSongMetrics).toHaveBeenCalledWith(songId);
    });
  });

  describe('createAlbum', () => {
    it('should create an album successfully', async () => {
      const albumId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const result = { message: 'Album created successfully', albumId };
      mockMetricsService.createAlbum.mockResolvedValue(result);

      expect(await controller.createAlbum(albumId)).toBe(result);
      expect(mockMetricsService.createAlbum).toHaveBeenCalledWith(albumId);
    });
  });

  describe('incrementAlbumLikes', () => {
    it('should increment album likes successfully', async () => {
      const albumId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const result = { message: 'Album like recorded' };
      mockMetricsService.incrementAlbumLikes.mockResolvedValue(result);

      expect(await controller.incrementAlbumLikes(albumId)).toBe(result);
      expect(mockMetricsService.incrementAlbumLikes).toHaveBeenCalledWith(
        albumId,
      );
    });
  });

  describe('incrementAlbumShares', () => {
    it('should increment album shares successfully', async () => {
      const albumId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const result = { message: 'Album share recorded' };
      mockMetricsService.incrementAlbumShares.mockResolvedValue(result);

      expect(await controller.incrementAlbumShares(albumId)).toBe(result);
      expect(mockMetricsService.incrementAlbumShares).toHaveBeenCalledWith(
        albumId,
      );
    });
  });

  describe('getAlbumMetrics', () => {
    it('should get album metrics successfully', async () => {
      const albumId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const result = {
        albumId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        likes: 8,
        shares: 3,
        totalPlays: 25,
        songPlays: {
          'f47ac10b-58cc-4372-a567-0e02b2c3d479': 10,
          '6ba7b811-9dad-11d1-80b4-00c04fd430c8': 15,
        },
      };
      mockMetricsService.getAlbumMetrics.mockResolvedValue(result);

      expect(await controller.getAlbumMetrics(albumId)).toBe(result);
      expect(mockMetricsService.getAlbumMetrics).toHaveBeenCalledWith(albumId);
    });
  });

  describe('addSongToAlbum', () => {
    it('should add song to album successfully', async () => {
      const songAlbumDto = {
        songId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        albumId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      };
      const result = { message: 'Song added to album successfully' };
      mockMetricsService.addSongToAlbum.mockResolvedValue(result);

      expect(await controller.addSongToAlbum(songAlbumDto)).toBe(result);
      expect(mockMetricsService.addSongToAlbum).toHaveBeenCalledWith(
        songAlbumDto.songId,
        songAlbumDto.albumId,
      );
    });
  });

  describe('removeSongFromAlbum', () => {
    it('should remove song from album successfully', async () => {
      const songAlbumDto = {
        songId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        albumId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      };
      const result = { message: 'Song removed from album successfully' };
      mockMetricsService.removeSongFromAlbum.mockResolvedValue(result);

      expect(await controller.removeSongFromAlbum(songAlbumDto)).toBe(result);
      expect(mockMetricsService.removeSongFromAlbum).toHaveBeenCalledWith(
        songAlbumDto.songId,
        songAlbumDto.albumId,
      );
    });
  });
});
