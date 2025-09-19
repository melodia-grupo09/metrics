import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { SongMetric } from './entities/song-metric.entity';
import { AlbumMetric } from './entities/album-metric.entity';
import { SongAlbum } from './entities/song-album.entity';

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
  ) {}

  // Song related methods
  incrementSongPlays(songId: string) {
    const data = { songId, metricType: 'play', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song', data);

    return { success: true, message: 'Song play recorded' };
  }

  incrementSongLikes(songId: string) {
    const data = { songId, metricType: 'like', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song', data);

    return { success: true, message: 'Song like recorded' };
  }

  incrementSongShares(songId: string) {
    const data = { songId, metricType: 'share', timestamp: new Date() };
    this.rabbitClient.emit('metrics.song', data);

    return { success: true, message: 'Song share recorded' };
  }

  async getSongMetrics(songId: string) {
    const metrics = await this.songMetricRepository.findOne({
      where: { songId },
    });

    if (!metrics) {
      return {
        songId,
        plays: 0,
        likes: 0,
        shares: 0,
      };
    }

    return {
      songId: metrics.songId,
      plays: metrics.plays,
      likes: metrics.likes,
      shares: metrics.shares,
    };
  }

  // Album related methods
  incrementAlbumLikes(albumId: string) {
    const data = { albumId, metricType: 'like', timestamp: new Date() };
    this.rabbitClient.emit('metrics.album', data);

    return { success: true, message: 'Album like recorded' };
  }

  incrementAlbumShares(albumId: string) {
    const data = { albumId, metricType: 'share', timestamp: new Date() };
    this.rabbitClient.emit('metrics.album', data);

    return { success: true, message: 'Album share recorded' };
  }

  async getAlbumMetrics(albumId: string) {
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
    const existingRelation = await this.songAlbumRepository.findOne({
      where: { songId, albumId },
    });

    if (existingRelation) {
      return {
        success: false,
        message: 'This song is already in the album',
      };
    }

    const songAlbum = new SongAlbum();
    songAlbum.songId = songId;
    songAlbum.albumId = albumId;

    await this.songAlbumRepository.save(songAlbum);

    return {
      success: true,
      message: 'Song added to album successfully',
    };
  }

  async removeSongFromAlbum(songId: string, albumId: string) {
    const result = await this.songAlbumRepository.delete({
      songId,
      albumId,
    });

    if (result.affected === 0) {
      return {
        success: false,
        message: 'Relation not found',
      };
    }

    return {
      success: true,
      message: 'Song removed from album successfully',
    };
  }
}
