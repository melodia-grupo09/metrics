import { Test, TestingModule } from '@nestjs/testing';
import { SongMetricsController } from './song-metrics.controller';
import { SongMetricsService } from './song-metrics.service';

describe('SongMetricsController', () => {
  let controller: SongMetricsController;

  const mockSongMetricsService = {
    createSong: jest.fn(),
    incrementSongPlays: jest.fn(),
    incrementSongLikes: jest.fn(),
    incrementSongShares: jest.fn(),
    getSongMetrics: jest.fn(),
    getTopSongs: jest.fn(),
    deleteSong: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SongMetricsController],
      providers: [
        {
          provide: SongMetricsService,
          useValue: mockSongMetricsService,
        },
      ],
    }).compile();

    controller = module.get<SongMetricsController>(SongMetricsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSong', () => {
    it('should create a song successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = { message: 'Song created successfully', songId };
      mockSongMetricsService.createSong.mockResolvedValue(result);

      expect(await controller.createSong(songId)).toBe(result);
      expect(mockSongMetricsService.createSong).toHaveBeenCalledWith(songId);
    });
  });

  describe('incrementSongPlays', () => {
    it('should increment song plays successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const playDto = {
        artistId: 'artist-123',
        userId: 'user-456',
      };
      const result = { message: 'Song play recorded' };
      mockSongMetricsService.incrementSongPlays.mockResolvedValue(result);

      expect(await controller.incrementSongPlays(songId, playDto)).toBe(result);
      expect(mockSongMetricsService.incrementSongPlays).toHaveBeenCalledWith(
        songId,
        playDto.artistId,
        playDto.userId,
      );
    });
  });

  describe('incrementSongLikes', () => {
    it('should increment song likes successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = { message: 'Song like recorded' };
      mockSongMetricsService.incrementSongLikes.mockResolvedValue(result);

      expect(await controller.incrementSongLikes(songId)).toBe(result);
      expect(mockSongMetricsService.incrementSongLikes).toHaveBeenCalledWith(
        songId,
      );
    });
  });

  describe('incrementSongShares', () => {
    it('should increment song shares successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = { message: 'Song share recorded' };
      mockSongMetricsService.incrementSongShares.mockResolvedValue(result);

      expect(await controller.incrementSongShares(songId)).toBe(result);
      expect(mockSongMetricsService.incrementSongShares).toHaveBeenCalledWith(
        songId,
      );
    });
  });

  describe('getSongMetrics', () => {
    it('should get song metrics successfully', async () => {
      const songId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = {
        songId,
        plays: 100,
        likes: 50,
        shares: 25,
      };
      mockSongMetricsService.getSongMetrics.mockResolvedValue(result);

      expect(await controller.getSongMetrics(songId)).toBe(result);
      expect(mockSongMetricsService.getSongMetrics).toHaveBeenCalledWith(
        songId,
      );
    });
  });

  describe('getTopSongs', () => {
    it('should get top songs with default limit', async () => {
      const result = [
        { songId: 'song1', plays: 100, likes: 50, shares: 25 },
        { songId: 'song2', plays: 90, likes: 40, shares: 20 },
        { songId: 'song3', plays: 80, likes: 30, shares: 15 },
      ];
      mockSongMetricsService.getTopSongs.mockResolvedValue(result);

      expect(await controller.getTopSongs()).toBe(result);
      expect(mockSongMetricsService.getTopSongs).toHaveBeenCalledWith(10);
    });

    it('should get top songs with custom limit', async () => {
      const limit = 5;
      const result = [
        { songId: 'song1', plays: 100, likes: 50, shares: 25 },
        { songId: 'song2', plays: 90, likes: 40, shares: 20 },
      ];
      mockSongMetricsService.getTopSongs.mockResolvedValue(result);

      expect(await controller.getTopSongs(limit)).toBe(result);
      expect(mockSongMetricsService.getTopSongs).toHaveBeenCalledWith(5);
    });

    it('should parse string limit to number', async () => {
      const limit = 3;
      const result = [{ songId: 'song1', plays: 100, likes: 50, shares: 25 }];
      mockSongMetricsService.getTopSongs.mockResolvedValue(result);

      expect(await controller.getTopSongs(limit)).toBe(result);
      expect(mockSongMetricsService.getTopSongs).toHaveBeenCalledWith(3);
    });
  });

  describe('deleteSong', () => {
    it('should delete a song', async () => {
      const songId = 'song123';
      const result = { message: 'Song deleted successfully' };
      mockSongMetricsService.deleteSong.mockResolvedValue(result);

      expect(await controller.deleteSong(songId)).toBe(result);
      expect(mockSongMetricsService.deleteSong).toHaveBeenCalledWith(songId);
    });
  });
});
