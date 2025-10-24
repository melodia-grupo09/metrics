import { Test, TestingModule } from '@nestjs/testing';
import { AlbumMetricsController } from './album-metrics.controller';
import { AlbumMetricsService } from './album-metrics.service';

describe('AlbumMetricsController', () => {
  let controller: AlbumMetricsController;
  let service: AlbumMetricsService;

  const mockAlbumMetricsService = {
    createAlbum: jest.fn(),
    incrementAlbumLikes: jest.fn(),
    incrementAlbumShares: jest.fn(),
    getAlbumMetrics: jest.fn(),
    getTopAlbums: jest.fn(),
    deleteAlbum: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlbumMetricsController],
      providers: [
        {
          provide: AlbumMetricsService,
          useValue: mockAlbumMetricsService,
        },
      ],
    }).compile();

    controller = module.get<AlbumMetricsController>(AlbumMetricsController);
    service = module.get<AlbumMetricsService>(AlbumMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createAlbum', () => {
    it('should create a new album', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedResult = {
        message: 'Album created successfully',
        albumId,
      };

      mockAlbumMetricsService.createAlbum.mockResolvedValue(expectedResult);

      const result = await controller.createAlbum(albumId);

      expect(result).toEqual(expectedResult);
      expect(service.createAlbum).toHaveBeenCalledWith(albumId);
    });
  });

  describe('incrementAlbumLikes', () => {
    it('should increment album likes', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedResult = { message: 'Album like recorded' };

      mockAlbumMetricsService.incrementAlbumLikes.mockResolvedValue(
        expectedResult,
      );

      const result: { message: string } =
        await controller.incrementAlbumLikes(albumId);

      expect(result).toEqual(expectedResult);
      expect(service.incrementAlbumLikes).toHaveBeenCalledWith(albumId);
    });
  });

  describe('incrementAlbumShares', () => {
    it('should increment album shares', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedResult = { message: 'Album share recorded' };

      mockAlbumMetricsService.incrementAlbumShares.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.incrementAlbumShares(albumId);

      expect(result).toEqual(expectedResult);
      expect(service.incrementAlbumShares).toHaveBeenCalledWith(albumId);
    });
  });

  describe('getAlbumMetrics', () => {
    it('should return album metrics with calculated plays from songIds', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      const songIds = ['song1-uuid', 'song2-uuid'];
      const mockMetrics = { albumId, plays: 150, likes: 10, shares: 5 };

      mockAlbumMetricsService.getAlbumMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getAlbumMetrics(albumId, songIds);

      expect(result).toEqual(mockMetrics);
      expect(mockAlbumMetricsService.getAlbumMetrics).toHaveBeenCalledWith(
        albumId,
        songIds,
      );
    });

    it('should return album metrics without plays when songIds not provided', async () => {
      const albumId = '123e4567-e89b-12d3-a456-426614174000';
      const mockMetrics = { albumId, plays: 0, likes: 10, shares: 5 };

      mockAlbumMetricsService.getAlbumMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getAlbumMetrics(albumId);

      expect(result).toEqual(mockMetrics);
      expect(mockAlbumMetricsService.getAlbumMetrics).toHaveBeenCalledWith(
        albumId,
        undefined,
      );
    });
  });

  describe('getTopAlbums', () => {
    it('should get top albums with default limit', async () => {
      const result = [
        { albumId: 'album1', likes: 50, shares: 25 },
        { albumId: 'album2', likes: 30, shares: 15 },
      ];
      mockAlbumMetricsService.getTopAlbums.mockResolvedValue(result);

      expect(await controller.getTopAlbums()).toBe(result);
      expect(mockAlbumMetricsService.getTopAlbums).toHaveBeenCalledWith(10);
    });

    it('should get top albums with custom limit', async () => {
      const limit = 5;
      const result = [{ albumId: 'album1', likes: 50, shares: 25 }];
      mockAlbumMetricsService.getTopAlbums.mockResolvedValue(result);

      expect(await controller.getTopAlbums(limit)).toBe(result);
      expect(mockAlbumMetricsService.getTopAlbums).toHaveBeenCalledWith(5);
    });

    it('should parse string limit to number', async () => {
      const limit = 3;
      const result = [{ albumId: 'album1', likes: 10, shares: 5 }];
      mockAlbumMetricsService.getTopAlbums.mockResolvedValue(result);

      expect(await controller.getTopAlbums(limit)).toBe(result);
      expect(mockAlbumMetricsService.getTopAlbums).toHaveBeenCalledWith(3);
    });
  });

  describe('deleteAlbum', () => {
    it('should delete an album', async () => {
      const albumId = 'album123';
      const result = { message: 'Album deleted successfully' };
      mockAlbumMetricsService.deleteAlbum.mockResolvedValue(result);

      expect(await controller.deleteAlbum(albumId)).toBe(result);
      expect(mockAlbumMetricsService.deleteAlbum).toHaveBeenCalledWith(albumId);
    });
  });
});
