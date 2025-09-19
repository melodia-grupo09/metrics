import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SongMetric } from './entities/song-metric.entity';
import { AlbumMetric } from './entities/album-metric.entity';

interface SongMetricEvent {
  pattern?: string;
  data: {
    songId: string;
    metricType: 'play' | 'like' | 'share';
    timestamp: Date;
  };
}

interface AlbumMetricEvent {
  pattern?: string;
  data: {
    albumId: string;
    metricType: 'like' | 'share';
    timestamp: Date;
  };
}

@Injectable()
export class MetricsConsumer implements OnModuleInit {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(MetricsConsumer.name);

  constructor(
    @InjectRepository(SongMetric)
    private songMetricRepository: Repository<SongMetric>,
    @InjectRepository(AlbumMetric)
    private albumMetricRepository: Repository<AlbumMetric>,
  ) {
    const connection = amqp.connect(['amqp://localhost:5672']);
    this.channelWrapper = connection.createChannel();
  }

  public async onModuleInit() {
    try {
      await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
        // Create queue for song metrics
        await channel.assertQueue('metrics_queue', { durable: true });
        await channel.consume('metrics_queue', (message) => {
          if (message) {
            try {
              type MetricEvent = SongMetricEvent | AlbumMetricEvent;
              const eventData = JSON.parse(
                message.content.toString(),
              ) as MetricEvent;
              this.logger.log('Received message:', eventData);

              // Determine if it's a song or album metric based on pattern
              if (eventData.pattern === 'metrics.song') {
                this.handleSongMetric(eventData as SongMetricEvent)
                  .then(() => channel.ack(message))
                  .catch((error) => {
                    this.logger.error('Error processing song message:', error);
                    channel.ack(message);
                  });
              } else if (eventData.pattern === 'metrics.album') {
                this.handleAlbumMetric(eventData as AlbumMetricEvent)
                  .then(() => channel.ack(message))
                  .catch((error) => {
                    this.logger.error('Error processing album message:', error);
                    channel.ack(message);
                  });
              } else {
                this.logger.warn(
                  `Unknown message pattern: ${eventData.pattern}`,
                );
                channel.ack(message);
              }
            } catch (error) {
              this.logger.error('Error processing message:', error);
              channel.ack(message);
            }
          }
        });
      });

      this.logger.log('Metrics consumer started and listening for messages.');
    } catch (err) {
      this.logger.error('Error starting the consumer:', err);
    }
  }

  async handleSongMetric(eventData: SongMetricEvent) {
    this.logger.log('Processing message:', eventData);
    try {
      // Extraemos los datos del mensaje
      const data = eventData.data;

      if (!data || !data.songId) {
        this.logger.error('Invalid message format: missing data.songId');
        return;
      }

      let songMetric = await this.songMetricRepository.findOne({
        where: { songId: data.songId },
      });

      if (!songMetric) {
        songMetric = new SongMetric();
        songMetric.songId = data.songId;
        songMetric.plays = 0;
        songMetric.likes = 0;
        songMetric.shares = 0;
      }

      switch (data.metricType) {
        case 'play':
          songMetric.plays += 1;
          break;
        case 'like':
          songMetric.likes += 1;
          break;
        case 'share':
          songMetric.shares += 1;
          break;
        default:
          this.logger.warn(`Unknown metric type: ${String(data.metricType)}`);
      }

      await this.songMetricRepository.save(songMetric);
      this.logger.log(`Updated ${data.metricType} for song ${data.songId}`);
    } catch (error) {
      this.logger.error('Error processing song metric:', error);
      throw error;
    }
  }

  async handleAlbumMetric(eventData: AlbumMetricEvent) {
    this.logger.log('Processing album message:', eventData);
    try {
      const data = eventData.data;

      if (!data || !data.albumId) {
        this.logger.error('Invalid message format: missing data.albumId');
        return;
      }

      let albumMetric = await this.albumMetricRepository.findOne({
        where: { albumId: data.albumId },
      });

      if (!albumMetric) {
        albumMetric = new AlbumMetric();
        albumMetric.albumId = data.albumId;
        albumMetric.likes = 0;
        albumMetric.shares = 0;
      }

      switch (data.metricType) {
        case 'like':
          albumMetric.likes += 1;
          break;
        case 'share':
          albumMetric.shares += 1;
          break;
        default:
          this.logger.warn(
            `Unknown album metric type: ${String(data.metricType)}`,
          );
      }

      await this.albumMetricRepository.save(albumMetric);
      this.logger.log(`Updated ${data.metricType} for album ${data.albumId}`);
    } catch (error) {
      this.logger.error('Error processing album metric:', error);
      throw error;
    }
  }
}
