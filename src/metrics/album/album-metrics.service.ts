import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { AlbumMetric } from '../entities/album-metric.entity';
import { SongMetric } from '../entities/song-metric.entity';

@Injectable()
export class AlbumMetricsService {
  constructor(
    @Inject('METRICS_SERVICE') private readonly rabbitClient: ClientProxy,
    @InjectModel(AlbumMetric.name)
    private albumMetricModel: Model<AlbumMetric>,
    @InjectModel(SongMetric.name)
    private songMetricModel: Model<SongMetric>,
  ) {}

  async createAlbum(albumId: string) {
    const existingMetric = await this.albumMetricModel
      .findOne({ albumId })
      .exec();

    if (existingMetric) {
      throw new BadRequestException('Album already exists');
    }

    const albumMetric = new this.albumMetricModel({
      albumId,
      likes: 0,
      shares: 0,
    });

    await albumMetric.save();

    return {
      message: 'Album created successfully',
      albumId,
    };
  }

  async incrementAlbumLikes(albumId: string) {
    const exists = await this.albumExists(albumId);
    if (!exists) {
      throw new NotFoundException('Album not found');
    }

    const data = { albumId, metricType: 'like', timestamp: new Date() };
    this.rabbitClient.emit('metrics.album.like', data);

    return { message: 'Album like recorded' };
  }

  async incrementAlbumShares(albumId: string) {
    const exists = await this.albumExists(albumId);
    if (!exists) {
      throw new NotFoundException('Album not found');
    }

    const data = { albumId, metricType: 'share', timestamp: new Date() };
    this.rabbitClient.emit('metrics.album.share', data);

    return { message: 'Album share recorded' };
  }

  private async albumExists(albumId: string): Promise<boolean> {
    const metric = await this.albumMetricModel.findOne({ albumId }).exec();
    return metric !== null;
  }

  async getAlbumMetrics(albumId: string, songIds?: string[]) {
    const albumMetrics = await this.albumMetricModel
      .findOne({ albumId })
      .exec();

    if (!albumMetrics) {
      throw new NotFoundException('Album not found');
    }

    let totalPlays = 0;
    if (songIds && songIds.length > 0) {
      const songs = await this.songMetricModel
        .find({ songId: { $in: songIds } })
        .exec();

      totalPlays = songs.reduce((sum, song) => sum + song.plays, 0);
    }

    return {
      albumId: albumMetrics.albumId,
      plays: totalPlays, // Calculated from songs
      likes: albumMetrics.likes,
      shares: albumMetrics.shares,
    };
  }
}
