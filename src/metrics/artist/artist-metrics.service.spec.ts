import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ArtistMetricsService } from './artist-metrics.service';
import { ArtistMetric } from '../entities/artist-metric.entity';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { UserPlay } from '../entities/user-play.entity';
import { UserLike } from '../entities/user-like.entity';
import { UserShare } from '../entities/user-share.entity';

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

describe('ArtistMetricsService', () => {
  let service: ArtistMetricsService;
  let mockArtistMetricModel: any;
  let mockUserPlayModel: any;
  let mockUserLikeModel: any;
  let mockUserShareModel: any;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    mockRabbitMQ.mockClear();
    mockAddSetup.mockClear();

    mockArtistMetricModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
      find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      }),
      aggregate: jest.fn(),
      deleteOne: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
    };

    mockUserPlayModel = {
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn(),
    };
    mockUserLikeModel = { countDocuments: jest.fn().mockResolvedValue(0) };
    mockUserShareModel = { countDocuments: jest.fn().mockResolvedValue(0) };

    const MockArtistMetric = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue(dto),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtistMetricsService,
        {
          provide: getModelToken(ArtistMetric.name),
          useValue: Object.assign(MockArtistMetric, mockArtistMetricModel),
        },
        {
          provide: getModelToken(UserPlay.name),
          useValue: mockUserPlayModel,
        },
        {
          provide: getModelToken(UserLike.name),
          useValue: mockUserLikeModel,
        },
        {
          provide: getModelToken(UserShare.name),
          useValue: mockUserShareModel,
        },
      ],
    }).compile();

    service = module.get<ArtistMetricsService>(ArtistMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createArtist', () => {
    it('should create a new artist', async () => {
      const artistId = 'artist-123';
      mockArtistMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.createArtist(artistId);

      expect(result).toEqual({
        message: 'Artist created successfully',
        artistId,
      });
      expect(mockArtistMetricModel.findOne).toHaveBeenCalledWith({ artistId });
    });

    it('should throw BadRequestException if artist already exists', async () => {
      const artistId = 'artist-123';
      mockArtistMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ artistId }),
      });

      await expect(service.createArtist(artistId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addListener', () => {
    it('should add a listener for an existing artist', async () => {
      const artistId = 'artist-123';
      const userId = 'user-456';
      mockArtistMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ artistId }),
      });

      const result = await service.addListener(artistId, userId);

      expect(result).toEqual({ message: 'Artist listener recorded' });
      expect(mockRabbitMQ).toHaveBeenCalled();
    });

    it('should throw NotFoundException if artist does not exist', async () => {
      const artistId = 'artist-123';
      const userId = 'user-456';
      mockArtistMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.addListener(artistId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMonthlyListeners', () => {
    it('should return monthly listeners for an artist', async () => {
      const artistId = 'artist-123';
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const mockArtist = {
        artistId,
        listeners: [
          { userId: 'user-1', timestamp: now },
          { userId: 'user-2', timestamp: now },
          { userId: 'user-1', timestamp: new Date(now.getTime() - 86400000) }, // 1 day ago
        ],
        timestamp: now,
      };

      mockArtistMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockArtist),
      });

      const result = await service.getMonthlyListeners(artistId);

      expect(result.artistId).toBe(artistId);
      expect(result.monthlyListeners).toBe(2); // user-1 and user-2
      expect(result.lastUpdated).toBe(now);
    });

    it('should throw NotFoundException if artist does not exist', async () => {
      const artistId = 'artist-123';
      mockArtistMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getMonthlyListeners(artistId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle missing listeners array gracefully', async () => {
      const artistId = 'artist-123';
      const mockArtist = {
        artistId,
        listeners: undefined,
        timestamp: new Date(),
      };

      mockArtistMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockArtist),
      });

      const result = await service.getMonthlyListeners(artistId);
      expect(result.monthlyListeners).toBe(0);
    });
  });

  describe('getAllArtistsMetrics', () => {
    it('should return metrics for all artists', async () => {
      const now = new Date();
      const mockArtists = [
        {
          artistId: 'artist-1',
          listeners: [{ userId: 'user-1', timestamp: now }],
          followers: [],
          timestamp: now,
        },
        {
          artistId: 'artist-2',
          listeners: [
            { userId: 'user-2', timestamp: now },
            { userId: 'user-3', timestamp: now },
          ],
          followers: [],
          timestamp: now,
        },
      ];

      mockArtistMetricModel.find.mockReturnValueOnce({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockArtists),
      });

      mockArtistMetricModel.countDocuments.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(2),
      });

      const result = await service.getAllArtistsMetrics();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].metrics.listeners).toBe(1);
      expect(result.data[1].metrics.listeners).toBe(2);
    });
  });

  describe('deleteArtist', () => {
    it('should delete an existing artist', async () => {
      const artistId = 'artist-123';
      mockArtistMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ artistId }),
      });
      mockArtistMetricModel.deleteOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({}),
      });

      const result = await service.deleteArtist(artistId);

      expect(result).toEqual({
        message: 'Artist deleted successfully',
        artistId,
      });
    });

    it('should throw NotFoundException if artist does not exist', async () => {
      const artistId = 'artist-123';
      mockArtistMetricModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteArtist(artistId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTopArtists', () => {
    it('should return top artists with default limit', async () => {
      const mockAggregateResult = [
        {
          artistId: 'artist-1',
          monthlyListeners: 1500,
          lastUpdated: new Date('2023-01-01'),
        },
        {
          artistId: 'artist-2',
          monthlyListeners: 1200,
          lastUpdated: new Date('2023-01-02'),
        },
      ];

      mockArtistMetricModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.getTopArtists();

      expect(result).toEqual(mockAggregateResult);
      expect(mockArtistMetricModel.aggregate).toHaveBeenCalledWith([
        { $unwind: { path: '$listeners', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            $or: [
              { listeners: { $exists: false } },
              { 'listeners.timestamp': { $gte: expect.any(Date) } },
            ],
          },
        },
        {
          $group: {
            _id: {
              artistId: '$artistId',
              userId: '$listeners.userId',
            },
            timestamp: { $first: '$timestamp' },
          },
        },
        {
          $group: {
            _id: '$_id.artistId',
            monthlyListeners: {
              $sum: {
                $cond: [{ $ne: ['$_id.userId', null] }, 1, 0],
              },
            },
            lastUpdated: { $first: '$timestamp' },
          },
        },
        { $sort: { monthlyListeners: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            artistId: '$_id',
            monthlyListeners: 1,
            lastUpdated: 1,
          },
        },
      ]);
    });

    it('should return top artists with custom limit', async () => {
      const limit = 5;
      const mockAggregateResult = [
        {
          artistId: 'artist-1',
          monthlyListeners: 1500,
          lastUpdated: new Date('2023-01-01'),
        },
      ];

      mockArtistMetricModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.getTopArtists(limit);

      expect(result).toEqual(mockAggregateResult);
      expect(mockArtistMetricModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ $limit: 5 })]),
      );
    });

    it('should return empty array when no artists exist', async () => {
      mockArtistMetricModel.aggregate.mockResolvedValue([]);

      const result = await service.getTopArtists();

      expect(result).toEqual([]);
      expect(mockArtistMetricModel.aggregate).toHaveBeenCalled();
    });

    it('should handle artists with no listeners', async () => {
      const mockAggregateResult = [
        {
          artistId: 'artist-no-listeners',
          monthlyListeners: 0,
          lastUpdated: new Date('2023-01-01'),
        },
      ];

      mockArtistMetricModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.getTopArtists();

      expect(result).toEqual(mockAggregateResult);
      expect(mockArtistMetricModel.aggregate).toHaveBeenCalled();
    });
  });

  describe('getArtistsMetricsCsv', () => {
    it('should return CSV string with metrics', async () => {
      const mockArtists = [
        {
          artistId: 'artist-1',
          listeners: [
            { userId: 'user-1', timestamp: new Date() },
            { userId: 'user-2', timestamp: new Date() },
          ],
          followers: [{ userId: 'user-1', timestamp: new Date() }],
        },
      ];

      mockArtistMetricModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockArtists),
      });

      // Mock countDocuments for plays, likes, shares
      mockUserPlayModel.countDocuments.mockResolvedValue(10);
      mockUserLikeModel.countDocuments.mockResolvedValue(5);
      mockUserShareModel.countDocuments.mockResolvedValue(2);

      const csv = await service.getArtistsMetricsCsv('monthly');

      expect(csv).toContain('artistId');
      expect(csv).toContain('artist-1');
      expect(csv).toContain('10'); // plays
      expect(csv).toContain('5'); // likes
      expect(csv).toContain('2'); // shares
    });

    it('should handle custom date range', async () => {
      mockArtistMetricModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      const csv = await service.getArtistsMetricsCsv(
        'custom',
        startDate,
        endDate,
      );

      expect(csv).toContain('artistId');
    });
  });

  describe('getArtistMetrics', () => {
    it('should return metrics filtered by region', async () => {
      const artistId = 'artist-123';
      const region = 'Argentina';
      const artistMetric = {
        artistId,
        listeners: [
          { userId: 'user1', timestamp: new Date(), region: 'Argentina' },
          { userId: 'user2', timestamp: new Date(), region: 'Brazil' },
        ],
        followers: [
          { userId: 'user1', timestamp: new Date(), region: 'Argentina' },
        ],
        timestamp: new Date(),
      };

      mockArtistMetricModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(artistMetric),
      });

      mockUserPlayModel.countDocuments.mockResolvedValue(10);
      mockUserLikeModel.countDocuments.mockResolvedValue(5);
      mockUserShareModel.countDocuments.mockResolvedValue(2);

      const result = await service.getArtistMetrics(artistId, region);

      expect(result.monthlyListeners).toBe(1); // Only user1 from Argentina
      expect(result.followers.total).toBe(1); // Only user1 from Argentina
      expect(mockUserPlayModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ region }),
      );
    });
  });

  describe('getTopMarkets', () => {
    it('should return top markets for an artist', async () => {
      const artistId = 'artist-123';
      const expectedMarkets = [
        { region: 'Argentina', plays: 100 },
        { region: 'Brazil', plays: 50 },
      ];

      mockUserPlayModel.aggregate.mockResolvedValue(expectedMarkets);

      const result = await service.getTopMarkets(artistId);

      expect(result).toEqual(expectedMarkets);
      expect(mockUserPlayModel.aggregate).toHaveBeenCalled();
    });
  });

  describe('getTopSongs', () => {
    it('should return top songs for an artist', async () => {
      const artistId = 'artist-123';
      const expectedSongs = [
        { songId: 'song1', plays: 100 },
        { songId: 'song2', plays: 50 },
      ];

      mockUserPlayModel.aggregate.mockResolvedValue(expectedSongs);

      const result = await service.getTopSongs(artistId);

      expect(result).toEqual(expectedSongs);
      expect(mockUserPlayModel.aggregate).toHaveBeenCalled();
    });

    it('should filter top songs by region', async () => {
      const artistId = 'artist-123';
      const region = 'Argentina';
      const expectedSongs = [{ songId: 'song1', plays: 50 }];

      mockUserPlayModel.aggregate.mockResolvedValue(expectedSongs);

      await service.getTopSongs(
        artistId,
        'monthly',
        undefined,
        undefined,
        region,
      );

      expect(mockUserPlayModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({ region }),
          }),
        ]),
      );
    });
  });
});
