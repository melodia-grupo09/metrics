import { Test, TestingModule } from '@nestjs/testing';
import { ArtistMetricsController } from './artist-metrics.controller';
import { ArtistMetricsService } from './artist-metrics.service';

describe('ArtistMetricsController', () => {
  let controller: ArtistMetricsController;
  let service: ArtistMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtistMetricsController],
      providers: [
        {
          provide: ArtistMetricsService,
          useValue: {
            createArtist: jest.fn(),
            addListener: jest.fn(),
            getMonthlyListeners: jest.fn(),
            getAllArtistsMetrics: jest.fn(),
            getTopArtists: jest.fn(),
            deleteArtist: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ArtistMetricsController>(ArtistMetricsController);
    service = module.get<ArtistMetricsService>(ArtistMetricsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createArtist', () => {
    it('should create a new artist', async () => {
      const artistId = 'artist-123';
      const result = { message: 'Artist created successfully', artistId };

      jest.spyOn(service, 'createArtist').mockResolvedValue(result);

      expect(await controller.createArtist(artistId)).toEqual(result);
      expect(service.createArtist).toHaveBeenCalledWith(artistId);
    });
  });

  describe('addListener', () => {
    it('should add a listener to an artist', async () => {
      const artistId = 'artist-123';
      const userId = 'user-456';
      const result = { message: 'Artist listener recorded' };

      jest.spyOn(service, 'addListener').mockResolvedValue(result);

      expect(await controller.addListener(artistId, userId)).toEqual(result);
      expect(service.addListener).toHaveBeenCalledWith(artistId, userId);
    });
  });

  describe('getMonthlyListeners', () => {
    it('should return monthly listeners for an artist', async () => {
      const artistId = 'artist-123';
      const result = {
        artistId,
        monthlyListeners: 100,
        periodStart: new Date(),
        periodEnd: new Date(),
        lastUpdated: new Date(),
      };

      jest.spyOn(service, 'getMonthlyListeners').mockResolvedValue(result);

      expect(await controller.getMonthlyListeners(artistId)).toEqual(result);
      expect(service.getMonthlyListeners).toHaveBeenCalledWith(artistId);
    });
  });

  describe('getAllArtistsMetrics', () => {
    it('should return all artists metrics', async () => {
      const result = [
        {
          artistId: 'artist-123',
          monthlyListeners: 100,
          periodStart: new Date(),
          periodEnd: new Date(),
          lastUpdated: new Date(),
        },
      ];

      jest.spyOn(service, 'getAllArtistsMetrics').mockResolvedValue(result);

      expect(await controller.getAllArtistsMetrics()).toEqual(result);
      expect(service.getAllArtistsMetrics).toHaveBeenCalled();
    });
  });

  describe('getTopArtists', () => {
    it('should get top artists with default limit', async () => {
      const result = [
        {
          artistId: 'artist-123',
          monthlyListeners: 1500,
          lastUpdated: new Date('2023-01-01'),
        },
        {
          artistId: 'artist-456',
          monthlyListeners: 1200,
          lastUpdated: new Date('2023-01-02'),
        },
      ];

      jest.spyOn(service, 'getTopArtists').mockResolvedValue(result);

      expect(await controller.getTopArtists()).toBe(result);
      expect(service.getTopArtists).toHaveBeenCalledWith(10);
    });

    it('should get top artists with custom limit', async () => {
      const limit = 5;
      const result = [
        {
          artistId: 'artist-123',
          monthlyListeners: 1500,
          lastUpdated: new Date('2023-01-01'),
        },
      ];

      jest.spyOn(service, 'getTopArtists').mockResolvedValue(result);

      expect(await controller.getTopArtists(limit)).toBe(result);
      expect(service.getTopArtists).toHaveBeenCalledWith(5);
    });

    it('should parse string limit to number', async () => {
      const limit = 15; // Parsed from string query param
      const result = [
        {
          artistId: 'artist-789',
          monthlyListeners: 800,
          lastUpdated: new Date('2023-01-03'),
        },
      ];

      jest.spyOn(service, 'getTopArtists').mockResolvedValue(result);

      expect(await controller.getTopArtists(limit)).toBe(result);
      expect(service.getTopArtists).toHaveBeenCalledWith(15);
    });

    it('should handle undefined limit and use default', async () => {
      const result = [
        {
          artistId: 'artist-default',
          monthlyListeners: 500,
          lastUpdated: new Date('2023-01-04'),
        },
      ];

      jest.spyOn(service, 'getTopArtists').mockResolvedValue(result);

      expect(await controller.getTopArtists(undefined)).toBe(result);
      expect(service.getTopArtists).toHaveBeenCalledWith(10);
    });
  });

  describe('deleteArtist', () => {
    it('should delete an artist', async () => {
      const artistId = 'artist-123';
      const result = { message: 'Artist deleted successfully', artistId };

      jest.spyOn(service, 'deleteArtist').mockResolvedValue(result);

      expect(await controller.deleteArtist(artistId)).toEqual(result);
      expect(service.deleteArtist).toHaveBeenCalledWith(artistId);
    });
  });
});
