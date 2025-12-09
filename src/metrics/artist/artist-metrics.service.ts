import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';

import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { ArtistMetric } from '../entities/artist-metric.entity';
import { UserPlay } from '../entities/user-play.entity';
import { UserLike } from '../entities/user-like.entity';
import { UserShare } from '../entities/user-share.entity';
import { Parser } from 'json2csv';

export interface TopArtistMetric {
  artistId: string;
  monthlyListeners: number;
  lastUpdated: Date;
}

@Injectable()
export class ArtistMetricsService implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(ArtistMetricsService.name);

  constructor(
    @InjectModel(ArtistMetric.name)
    private artistMetricModel: Model<ArtistMetric>,
    @InjectModel(UserPlay.name) private userPlayModel: Model<UserPlay>,
    @InjectModel(UserLike.name) private userLikeModel: Model<UserLike>,
    @InjectModel(UserShare.name) private userShareModel: Model<UserShare>,
  ) {
    const rabbitUrl =
      process.env.CLOUDAMQP_URL ||
      process.env.RABBITMQ_URL ||
      'amqp://localhost:5672';
    const connection = amqp.connect([rabbitUrl]);
    this.channelWrapper = connection.createChannel();
  }

  async onModuleInit() {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.assertExchange('metrics_exchange', 'topic', {
        durable: true,
      });
    });
  }

  private async artistExists(artistId: string): Promise<boolean> {
    const metric = await this.artistMetricModel.findOne({ artistId }).exec();
    return metric !== null;
  }

  async createArtist(artistId: string) {
    const existingMetric = await this.artistMetricModel
      .findOne({ artistId })
      .exec();

    if (existingMetric) {
      throw new BadRequestException('Artist already exists');
    }

    const artistMetric = new this.artistMetricModel({
      artistId,
      listeners: [],
    });

    await artistMetric.save();

    return {
      message: 'Artist created successfully',
      artistId,
    };
  }

  async addListener(artistId: string, userId: string) {
    const exists = await this.artistExists(artistId);
    if (!exists) {
      throw new NotFoundException('Artist not found');
    }

    const data = { artistId, userId, timestamp: new Date() };

    await this.channelWrapper.publish(
      'metrics_exchange',
      'metrics.artist.listener',
      Buffer.from(JSON.stringify(data)),
    );

    return { message: 'Artist listener recorded' };
  }

  async addFollower(artistId: string, userId: string) {
    const exists = await this.artistExists(artistId);
    if (!exists) {
      throw new NotFoundException('Artist not found');
    }

    const data = { artistId, userId, timestamp: new Date() };

    await this.channelWrapper.publish(
      'metrics_exchange',
      'metrics.artist.follow',
      Buffer.from(JSON.stringify(data)),
    );

    return { message: 'Artist follower recorded' };
  }

  async removeFollower(artistId: string, userId: string) {
    const exists = await this.artistExists(artistId);
    if (!exists) {
      throw new NotFoundException('Artist not found');
    }

    const data = { artistId, userId, timestamp: new Date() };

    await this.channelWrapper.publish(
      'metrics_exchange',
      'metrics.artist.unfollow',
      Buffer.from(JSON.stringify(data)),
    );

    return { message: 'Artist follower removed' };
  }

  async getMonthlyListeners(artistId: string) {
    const artistMetric = await this.artistMetricModel
      .findOne({ artistId })
      .exec();

    if (!artistMetric) {
      throw new NotFoundException('Artist not found');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const listeners = artistMetric.listeners || [];
    const recentListeners = listeners.filter(
      (listener) => new Date(listener.timestamp) >= thirtyDaysAgo,
    );

    const uniqueListeners = new Set(
      recentListeners.map((listener) => listener.userId),
    );

    return {
      artistId,
      monthlyListeners: uniqueListeners.size,
      periodStart: thirtyDaysAgo,
      periodEnd: new Date(),
      lastUpdated: artistMetric.timestamp,
    };
  }

  async getAllArtistsMetrics(
    page: number = 1,
    limit: number = 10,
    period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'monthly',
    startDate?: Date,
    endDate?: Date,
  ) {
    const { start, end } = this.getDateRange(period, startDate, endDate);
    const previousStart = new Date(start);
    const duration = end.getTime() - start.getTime();
    previousStart.setTime(previousStart.getTime() - duration);
    const previousEnd = new Date(start);

    const skip = (page - 1) * limit;
    const artists = await this.artistMetricModel
      .find()
      .skip(skip)
      .limit(limit)
      .exec();

    const totalArtists = await this.artistMetricModel.countDocuments().exec();

    const metrics = await Promise.all(
      artists.map(async (artist) => {
        const currentMetrics = await this.calculatePeriodMetrics(
          artist.artistId,
          start,
          end,
          artist,
        );
        const previousMetrics = await this.calculatePeriodMetrics(
          artist.artistId,
          previousStart,
          previousEnd,
          artist,
        );

        return {
          artistId: artist.artistId,
          periodStart: start,
          periodEnd: end,
          metrics: {
            listeners: currentMetrics.listeners,
            listenersVariation: this.calculatePercentageChange(
              currentMetrics.listeners,
              previousMetrics.listeners,
            ),
            followers: currentMetrics.followers,
            followersVariation: this.calculatePercentageChange(
              currentMetrics.followers,
              previousMetrics.followers,
            ),
            plays: currentMetrics.plays,
            playsVariation: this.calculatePercentageChange(
              currentMetrics.plays,
              previousMetrics.plays,
            ),
            likes: currentMetrics.likes,
            likesVariation: this.calculatePercentageChange(
              currentMetrics.likes,
              previousMetrics.likes,
            ),
            shares: currentMetrics.shares,
            sharesVariation: this.calculatePercentageChange(
              currentMetrics.shares,
              previousMetrics.shares,
            ),
          },
        };
      }),
    );

    return {
      data: metrics,
      meta: {
        total: totalArtists,
        page,
        limit,
        totalPages: Math.ceil(totalArtists / limit),
      },
    };
  }

  private getDateRange(
    period: 'daily' | 'weekly' | 'monthly' | 'custom',
    startDate?: Date,
    endDate?: Date,
  ): { start: Date; end: Date } {
    const end = endDate || new Date();
    let start = startDate;

    if (!start) {
      start = new Date(end);
      switch (period) {
        case 'daily':
          start.setDate(end.getDate() - 1);
          break;
        case 'weekly':
          start.setDate(end.getDate() - 7);
          break;
        case 'monthly':
          start.setMonth(end.getMonth() - 1);
          break;
        case 'custom':
          // If custom but no start date provided, default to 30 days
          start.setDate(end.getDate() - 30);
          break;
      }
    }

    return { start, end };
  }

  private async calculatePeriodMetrics(
    artistId: string,
    start: Date,
    end: Date,
    artistMetric: ArtistMetric,
  ) {
    // Listeners (from ArtistMetric.listeners array)
    // Assuming listeners array contains all unique listener events
    // We want unique users in the period
    const uniqueListeners = new Set(
      artistMetric.listeners
        .filter((l) => {
          const timestamp = new Date(l.timestamp);
          return timestamp >= start && timestamp <= end;
        })
        .map((l) => l.userId),
    );

    // Followers (Total at end of period)
    const followersCount = artistMetric.followers.filter(
      (f) => new Date(f.timestamp) <= end,
    ).length;

    // Plays (from UserPlay collection)
    const plays = await this.userPlayModel.countDocuments({
      artistId,
      timestamp: { $gte: start, $lte: end },
    });

    // Likes (from UserLike collection)
    const likes = await this.userLikeModel.countDocuments({
      artistId,
      timestamp: { $gte: start, $lte: end },
    });

    // Shares (from UserShare collection)
    const shares = await this.userShareModel.countDocuments({
      artistId,
      timestamp: { $gte: start, $lte: end },
    });

    return {
      listeners: uniqueListeners.size,
      followers: followersCount,
      plays,
      likes,
      shares,
    };
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  async getTopArtists(limit: number = 10): Promise<TopArtistMetric[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topArtists = await this.artistMetricModel.aggregate([
      // Unwind the listeners array to work with each element
      { $unwind: { path: '$listeners', preserveNullAndEmptyArrays: true } },

      // Filter only listeners from the last 30 days
      {
        $match: {
          $or: [
            { listeners: { $exists: false } }, // For artists without listeners
            { 'listeners.timestamp': { $gte: thirtyDaysAgo } },
          ],
        },
      },

      // Group by artistId and userId to get unique listeners
      {
        $group: {
          _id: {
            artistId: '$artistId',
            userId: '$listeners.userId',
          },
          timestamp: { $first: '$timestamp' },
        },
      },

      // Group again only by artistId to count unique listeners
      {
        $group: {
          _id: '$_id.artistId',
          monthlyListeners: {
            $sum: {
              $cond: [
                { $ne: ['$_id.userId', null] }, // Only count if userId is not null
                1,
                0,
              ],
            },
          },
          lastUpdated: { $first: '$timestamp' },
        },
      },

      // Sort by monthlyListeners descending
      { $sort: { monthlyListeners: -1 } },

      // Limit results
      { $limit: limit },

      // Final projection to format the response
      {
        $project: {
          _id: 0,
          artistId: '$_id',
          monthlyListeners: 1,
          lastUpdated: 1,
        },
      },
    ]);

    return topArtists as TopArtistMetric[];
  }

  async deleteArtist(artistId: string) {
    const exists = await this.artistExists(artistId);
    if (!exists) {
      throw new NotFoundException('Artist not found');
    }

    await this.artistMetricModel.deleteOne({ artistId }).exec();

    return {
      message: 'Artist deleted successfully',
      artistId,
    };
  }

  private async calculateVariation(
    model: Model<any>,
    query: FilterQuery<any>,
    dateField: string = 'timestamp',
    region?: string,
  ) {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const filter: FilterQuery<any> = { ...query };
    if (region) {
      filter.region = region;
    }

    const currentPeriodCount = await model.countDocuments({
      ...filter,
      [dateField]: { $gte: thirtyDaysAgo, $lt: now },
    });

    const previousPeriodCount = await model.countDocuments({
      ...filter,
      [dateField]: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
    });

    const delta = currentPeriodCount - previousPeriodCount;
    let percentage = 0;
    if (previousPeriodCount > 0) {
      percentage = (delta / previousPeriodCount) * 100;
    } else if (currentPeriodCount > 0) {
      percentage = 100;
    }

    return {
      total: currentPeriodCount,
      delta,
      percentage: parseFloat(percentage.toFixed(2)),
    };
  }

  async getArtistMetrics(artistId: string, region?: string) {
    const artistMetric = await this.artistMetricModel
      .findOne({ artistId })
      .exec();

    if (!artistMetric) {
      throw new NotFoundException('Artist not found');
    }

    // Monthly Listeners
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const listeners = artistMetric.listeners || [];
    let recentListeners = listeners.filter(
      (listener) => new Date(listener.timestamp) >= thirtyDaysAgo,
    );

    if (region) {
      recentListeners = recentListeners.filter(
        (l) => (l as { region?: string }).region === region,
      );
    }

    const uniqueListeners = new Set(
      recentListeners.map((listener) => listener.userId),
    );
    const monthlyListeners = uniqueListeners.size;

    // Followers
    let followers = artistMetric.followers || [];
    if (region) {
      followers = followers.filter(
        (f) => (f as { region?: string }).region === region,
      );
    }
    const totalFollowers = followers.length;

    // Calculate follower variation (new followers in last 30 days)
    const newFollowersLast30Days = followers.filter(
      (f) => new Date(f.timestamp) >= thirtyDaysAgo,
    ).length;

    const previousTotalFollowers = totalFollowers - newFollowersLast30Days;

    let followersPercentage = 0;
    if (previousTotalFollowers > 0) {
      followersPercentage =
        (newFollowersLast30Days / previousTotalFollowers) * 100;
    } else if (totalFollowers > 0) {
      followersPercentage = 100;
    }

    // Plays
    const playsMetrics = await this.calculateVariation(
      this.userPlayModel,
      { artistId },
      'timestamp',
      region,
    );

    // Saves (Likes)
    const savesMetrics = await this.calculateVariation(
      this.userLikeModel,
      { artistId },
      'timestamp',
      region,
    );

    // Shares
    const sharesMetrics = await this.calculateVariation(
      this.userShareModel,
      { artistId },
      'timestamp',
      region,
    );

    return {
      artistId,
      monthlyListeners,
      followers: {
        total: totalFollowers,
        delta: newFollowersLast30Days,
        percentage: parseFloat(followersPercentage.toFixed(2)),
      },
      plays: playsMetrics,
      saves: savesMetrics,
      shares: sharesMetrics,
      periodStart: thirtyDaysAgo,
      periodEnd: new Date(),
      lastUpdated: artistMetric.timestamp,
    };
  }

  async getTopMarkets(
    artistId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'monthly',
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{ region: string; plays: number }>> {
    const { start, end } = this.getDateRange(period, startDate, endDate);

    const topMarkets = await this.userPlayModel.aggregate([
      {
        $match: {
          artistId,
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$region',
          plays: { $sum: 1 },
        },
      },
      {
        $sort: { plays: -1 },
      },
      {
        $project: {
          _id: 0,
          region: '$_id',
          plays: 1,
        },
      },
    ]);

    return topMarkets as Array<{ region: string; plays: number }>;
  }

  async getTopSongs(
    artistId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'monthly',
    startDate?: Date,
    endDate?: Date,
    region?: string,
    sortBy: 'plays' | 'likes' = 'plays',
  ): Promise<Array<{ songId: string; count: number }>> {
    const { start, end } = this.getDateRange(period, startDate, endDate);
    const matchStage: FilterQuery<UserPlay | UserLike> = {
      artistId,
      timestamp: { $gte: start, $lte: end },
    };

    if (region) {
      matchStage.region = region;
    }

    let model: Model<any> = this.userPlayModel;
    if (sortBy === 'likes') {
      model = this.userLikeModel;
      matchStage.entityType = 'song';
    }

    const topSongs = await model.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: sortBy === 'likes' ? '$entityId' : '$songId',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          _id: 0,
          songId: '$_id',
          count: 1,
        },
      },
    ]);

    return topSongs as Array<{ songId: string; count: number }>;
  }

  async getArtistsMetricsCsv(
    period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'monthly',
    startDate?: Date,
    endDate?: Date,
  ): Promise<string> {
    const { start, end } = this.getDateRange(period, startDate, endDate);
    const previousStart = new Date(start);
    const duration = end.getTime() - start.getTime();
    previousStart.setTime(previousStart.getTime() - duration);
    const previousEnd = new Date(start);

    const artists = await this.artistMetricModel.find().exec();

    const metrics = await Promise.all(
      artists.map(async (artist) => {
        const currentMetrics = await this.calculatePeriodMetrics(
          artist.artistId,
          start,
          end,
          artist,
        );
        const previousMetrics = await this.calculatePeriodMetrics(
          artist.artistId,
          previousStart,
          previousEnd,
          artist,
        );

        return {
          artistId: artist.artistId,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          listeners: currentMetrics.listeners,
          listenersVariation: this.calculatePercentageChange(
            currentMetrics.listeners,
            previousMetrics.listeners,
          ),
          followers: currentMetrics.followers,
          followersVariation: this.calculatePercentageChange(
            currentMetrics.followers,
            previousMetrics.followers,
          ),
          plays: currentMetrics.plays,
          playsVariation: this.calculatePercentageChange(
            currentMetrics.plays,
            previousMetrics.plays,
          ),
          likes: currentMetrics.likes,
          likesVariation: this.calculatePercentageChange(
            currentMetrics.likes,
            previousMetrics.likes,
          ),
          shares: currentMetrics.shares,
          sharesVariation: this.calculatePercentageChange(
            currentMetrics.shares,
            previousMetrics.shares,
          ),
        };
      }),
    );

    const fields = [
      'artistId',
      'periodStart',
      'periodEnd',
      'listeners',
      'listenersVariation',
      'followers',
      'followersVariation',
      'plays',
      'playsVariation',
      'likes',
      'likesVariation',
      'shares',
      'sharesVariation',
    ];

    const parser = new Parser({ fields });
    return parser.parse(metrics);
  }
}
