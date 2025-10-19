import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ArtistMetricsService } from './artist-metrics.service';

@Controller('metrics/artists')
export class ArtistMetricsController {
  constructor(private readonly artistMetricsService: ArtistMetricsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createArtist(@Body('artistId') artistId: string) {
    return this.artistMetricsService.createArtist(artistId);
  }

  @Post(':artistId/listeners')
  @HttpCode(HttpStatus.OK)
  async addListener(
    @Param('artistId') artistId: string,
    @Body('userId') userId: string,
  ) {
    return this.artistMetricsService.addListener(artistId, userId);
  }

  @Get(':artistId/monthly-listeners')
  async getMonthlyListeners(@Param('artistId') artistId: string) {
    return this.artistMetricsService.getMonthlyListeners(artistId);
  }

  @Get()
  async getAllArtistsMetrics() {
    return this.artistMetricsService.getAllArtistsMetrics();
  }

  @Delete(':artistId')
  @HttpCode(HttpStatus.OK)
  async deleteArtist(@Param('artistId') artistId: string) {
    return this.artistMetricsService.deleteArtist(artistId);
  }
}
