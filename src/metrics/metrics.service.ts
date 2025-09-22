import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { AlbumMetric } from './entities/album-metric.entity';
import { SongAlbum } from './entities/song-album.entity';

@Injectable()
export class MetricsService {
  constructor(
    @Inject('METRICS_SERVICE') private readonly rabbitClient: ClientProxy,
    @InjectRepository(AlbumMetric)
    private albumMetricRepository: Repository<AlbumMetric>,
    @InjectRepository(SongAlbum)
    private songAlbumRepository: Repository<SongAlbum>,
  ) {}

  // Album related methods
  async createAlbum(albumId: string) {
    const existingMetric = await this.albumMetricRepository.findOne({
      where: { albumId },
    });

    if (existingMetric) {
      throw new BadRequestException('Album already exists');
    }

    const albumMetric = new AlbumMetric();
    albumMetric.albumId = albumId;
    albumMetric.likes = 0;
    albumMetric.shares = 0;

    await this.albumMetricRepository.save(albumMetric);

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
    this.rabbitClient.emit('metrics.album', data);

    return { message: 'Album like recorded' };
  }

  async incrementAlbumShares(albumId: string) {
    const exists = await this.albumExists(albumId);
    if (!exists) {
      throw new NotFoundException('Album not found');
    }

    const data = { albumId, metricType: 'share', timestamp: new Date() };
    this.rabbitClient.emit('metrics.album', data);

    return { message: 'Album share recorded' };
  }

  // Helper method to check if an album exists
  private async albumExists(albumId: string): Promise<boolean> {
    const metric = await this.albumMetricRepository.findOne({
      where: { albumId },
    });

    // Also check song-album relations
    const relation = await this.songAlbumRepository.findOne({
      where: { albumId },
    });

    return metric !== null || relation !== null;
  }

  async getAlbumMetrics(albumId: string) {
    const albumMetrics = await this.albumMetricRepository.findOne({
      where: { albumId },
    });

    if (!albumMetrics) {
      throw new NotFoundException('Album not found');
    }

    return {
      albumId: albumMetrics.albumId,
      likes: albumMetrics.likes,
      shares: albumMetrics.shares,
    };
  }
}
