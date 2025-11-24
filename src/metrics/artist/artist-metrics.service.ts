import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { ArtistMetric } from '../entities/artist-metric.entity';
import { UserPlay } from '../entities/user-play.entity';
import { UserLike } from '../entities/user-like.entity';
import { UserShare } from '../entities/user-share.entity';

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

    const recentListeners = artistMetric.listeners.filter(
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

  async getAllArtistsMetrics() {
    const artists = await this.artistMetricModel.find().exec();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return artists.map((artist) => {
      const recentListeners = artist.listeners.filter(
        (listener) => new Date(listener.timestamp) >= thirtyDaysAgo,
      );

      const uniqueListeners = new Set(
        recentListeners.map((listener) => listener.userId),
      );

      return {
        artistId: artist.artistId,
        monthlyListeners: uniqueListeners.size,
        periodStart: thirtyDaysAgo,
        periodEnd: new Date(),
        lastUpdated: artist.timestamp,
      };
    });
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
    query: any,
    dateField: string = 'timestamp',
  ) {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const currentPeriodCount = await model.countDocuments({
      ...query,
      [dateField]: { $gte: thirtyDaysAgo, $lt: now },
    });

    const previousPeriodCount = await model.countDocuments({
      ...query,
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

  async getArtistMetrics(artistId: string) {
    const artistMetric = await this.artistMetricModel
      .findOne({ artistId })
      .exec();

    if (!artistMetric) {
      throw new NotFoundException('Artist not found');
    }

    // Monthly Listeners
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentListeners = artistMetric.listeners.filter(
      (listener) => new Date(listener.timestamp) >= thirtyDaysAgo,
    );
    const uniqueListeners = new Set(
      recentListeners.map((listener) => listener.userId),
    );
    const monthlyListeners = uniqueListeners.size;

    // Followers
    const totalFollowers = artistMetric.followers.length;
    // Calculate follower variation (new followers in last 30 days)
    const newFollowersLast30Days = artistMetric.followers.filter(
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
    const playsMetrics = await this.calculateVariation(this.userPlayModel, {
      artistId,
    });

    // Saves (Likes)
    const savesMetrics = await this.calculateVariation(this.userLikeModel, {
      artistId,
    });

    // Shares
    const sharesMetrics = await this.calculateVariation(this.userShareModel, {
      artistId,
    });

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
}
