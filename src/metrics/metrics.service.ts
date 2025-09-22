import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { SongMetric } from './entities/song-metric.entity';
import { AlbumMetric } from './entities/album-metric.entity';
import { SongAlbum } from './entities/song-album.entity';
import { UserMetric } from './entities/user-metric.entity';

@Injectable()
export class MetricsService {
  constructor(
    @Inject('METRICS_SERVICE') private readonly rabbitClient: ClientProxy,
    @InjectRepository(SongMetric)
    private songMetricRepository: Repository<SongMetric>,
    @InjectRepository(AlbumMetric)
    private albumMetricRepository: Repository<AlbumMetric>,
    @InjectRepository(SongAlbum)
    private songAlbumRepository: Repository<SongAlbum>,
    @InjectRepository(UserMetric)
    private userMetricRepository: Repository<UserMetric>,
  ) {}

  private async songExists(songId: string): Promise<boolean> {
    const metric = await this.songMetricRepository.findOne({
      where: { songId },
    });

    return metric !== null;
  }

  // Song creation method
  async createSong(songId: string) {
    const existingMetric = await this.songMetricRepository.findOne({
      where: { songId },
    });

    if (existingMetric) {
      throw new BadRequestException('Song already exists');
    }

    const songMetric = new SongMetric();
    songMetric.songId = songId;
    songMetric.plays = 0;
    songMetric.likes = 0;
    songMetric.shares = 0;

    await this.songMetricRepository.save(songMetric);

    return {
      message: 'Song created successfully',
      songId,
    };
  }

  // Song related methods
  async incrementSongPlays(songId: string) {
    const exists = await this.songExists(songId);
    if (!exists) {
      throw new NotFoundException('Song not found');
    }

    const data = { songId, metricType: 'play', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song', data);

    return { message: 'Song play recorded' };
  }

  async incrementSongLikes(songId: string) {
    const exists = await this.songExists(songId);
    if (!exists) {
      throw new NotFoundException('Song not found');
    }

    const data = { songId, metricType: 'like', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song', data);

    return { message: 'Song like recorded' };
  }

  async incrementSongShares(songId: string) {
    const exists = await this.songExists(songId);
    if (!exists) {
      throw new NotFoundException('Song not found');
    }

    const data = { songId, metricType: 'share', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song', data);

    return { message: 'Song share recorded' };
  }

  async getSongMetrics(songId: string) {
    const metrics = await this.songMetricRepository.findOne({
      where: { songId },
    });

    if (!metrics) {
      throw new NotFoundException('Song not found');
    }

    return {
      songId: metrics.songId,
      plays: metrics.plays,
      likes: metrics.likes,
      shares: metrics.shares,
    };
  }

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
    const exists = await this.albumExists(albumId);
    if (!exists) {
      throw new NotFoundException('Album not found');
    }

    const albumMetrics = await this.albumMetricRepository.findOne({
      where: { albumId },
    });

    // Get all songs associated with this album
    const songAlbums = await this.songAlbumRepository.find({
      where: { albumId },
    });

    const songIds = songAlbums.map((sa) => sa.songId);

    let totalPlays = 0;
    const songPlays: Record<string, number> = {};

    if (songIds.length > 0) {
      const songMetrics = await this.songMetricRepository.find({
        where: songIds.map((id) => ({ songId: id })),
      });

      // Calculate total plays across all songs
      totalPlays = songMetrics.reduce((sum, metric) => sum + metric.plays, 0);

      // Create a map of individual song plays
      songMetrics.forEach((metric) => {
        songPlays[metric.songId] = metric.plays;
      });
    }

    return {
      albumId,
      likes: albumMetrics?.likes || 0,
      shares: albumMetrics?.shares || 0,
      totalPlays,
      songPlays,
    };
  }

  // Song-Album relation methods
  async addSongToAlbum(songId: string, albumId: string) {
    const songExists = await this.songExists(songId);
    if (!songExists) {
      throw new NotFoundException('Song not found');
    }

    const albumExists = await this.albumExists(albumId);
    if (!albumExists) {
      throw new NotFoundException('Album not found');
    }

    const existingRelation = await this.songAlbumRepository.findOne({
      where: { songId, albumId },
    });

    if (existingRelation) {
      throw new BadRequestException('This song is already in the album');
    }

    const songAlbum = new SongAlbum();
    songAlbum.songId = songId;
    songAlbum.albumId = albumId;

    await this.songAlbumRepository.save(songAlbum);

    return {
      message: 'Song added to album successfully',
    };
  }

  async removeSongFromAlbum(songId: string, albumId: string) {
    const songExists = await this.songExists(songId);
    if (!songExists) {
      throw new NotFoundException('Song not found');
    }

    const albumExists = await this.albumExists(albumId);
    if (!albumExists) {
      throw new NotFoundException('Album not found');
    }

    const result = await this.songAlbumRepository.delete({
      songId,
      albumId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Relation not found');
    }

    return {
      message: 'Song removed from album successfully',
    };
  }

  // User metrics methods
  async registerUser(userId: string, email: string) {
    const existingUser = await this.userMetricRepository.findOne({
      where: { userId },
    });

    if (existingUser) {
      throw new BadRequestException('User already registered');
    }

    const userMetric = this.userMetricRepository.create({
      userId,
      email,
      registrationDate: new Date(),
      lastActiveDate: new Date(),
    });

    await this.userMetricRepository.save(userMetric);

    this.rabbitClient.emit('metrics.user', {
      userId,
      email,
      metricType: 'registration',
      timestamp: new Date(),
    });

    return {
      message: 'User registered successfully',
      userId,
    };
  }

  async updateUserActivity(userId: string) {
    const userMetric = await this.userMetricRepository.findOne({
      where: { userId },
    });

    if (!userMetric) {
      throw new NotFoundException('User not found');
    }

    userMetric.lastActiveDate = new Date();
    await this.userMetricRepository.save(userMetric);

    this.rabbitClient.emit('metrics.user', {
      userId,
      metricType: 'activity',
      timestamp: new Date(),
    });

    return {
      message: 'User activity updated',
    };
  }

  async getNewRegistrations(startDate?: Date, endDate?: Date) {
    const query = this.userMetricRepository.createQueryBuilder('user');

    if (startDate) {
      query.andWhere('user.registrationDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('user.registrationDate <= :endDate', { endDate });
    }

    const users = await query.getMany();
    const totalRegistrations = users.length;

    return {
      totalRegistrations,
      users: users.map((user) => ({
        userId: user.userId,
        email: user.email,
        registrationDate: user.registrationDate,
      })),
    };
  }
}
