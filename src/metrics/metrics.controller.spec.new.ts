import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;

  const mockMetricsService = {
    createAlbum: jest.fn(),
    incrementAlbumLikes: jest.fn(),
    incrementAlbumShares: jest.fn(),
    getAlbumMetrics: jest.fn(),
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

  describe('createAlbum', () => {
    it('should create an album successfully', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = { message: 'Album created successfully', albumId };
      mockMetricsService.createAlbum.mockResolvedValue(result);

      expect(await controller.createAlbum(albumId)).toBe(result);
      expect(mockMetricsService.createAlbum).toHaveBeenCalledWith(albumId);
    });
  });

  describe('incrementAlbumLikes', () => {
    it('should increment album likes successfully', async () => {
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
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
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
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
      const albumId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const result = {
        albumId,
        likes: 10,
        shares: 5,
      };
      mockMetricsService.getAlbumMetrics.mockResolvedValue(result);

      expect(await controller.getAlbumMetrics(albumId)).toBe(result);
      expect(mockMetricsService.getAlbumMetrics).toHaveBeenCalledWith(albumId);
    });
  });
});
