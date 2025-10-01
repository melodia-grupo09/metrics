import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { AlbumMetric } from '../entities/album-metric.entity';
import { SongMetric } from '../entities/song-metric.entity';

@Injectable()
export class AlbumMetricsService {
  constructor(
    @Inject('METRICS_SERVICE') private readonly rabbitClient: ClientProxy,
    @InjectRepository(AlbumMetric)
    private albumMetricRepository: Repository<AlbumMetric>,
    @InjectRepository(SongMetric)
    private songMetricRepository: Repository<SongMetric>,
  ) {}

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
    const metric = await this.albumMetricRepository.findOne({
      where: { albumId },
    });

    return metric !== null;
  }

  async getAlbumMetrics(albumId: string, songIds?: string[]) {
    const albumMetrics = await this.albumMetricRepository.findOne({
      where: { albumId },
    });

    if (!albumMetrics) {
      throw new NotFoundException('Album not found');
    }

    let totalPlays = 0;
    if (songIds && songIds.length > 0) {
      const result = await this.songMetricRepository
        .createQueryBuilder('song')
        .select('SUM(song.plays)', 'total')
        .where('song.songId IN (:...songIds)', { songIds })
        .getRawOne<{ total: string }>();

      totalPlays = parseInt(result?.total || '0', 10);
    }

    return {
      albumId: albumMetrics.albumId,
      plays: totalPlays, // Calculated from songs
      likes: albumMetrics.likes,
      shares: albumMetrics.shares,
    };
  }
}
