import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ArtistMetricsService,
  TopArtistMetric,
} from './artist-metrics.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('artist-metrics')
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

  @ApiOperation({ summary: 'Get top artists by monthly listeners' })
  @ApiResponse({
    status: 200,
    description: 'Top artists retrieved successfully',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top artists to return (default: 10)',
  })
  @Get('top')
  async getTopArtists(
    @Query('limit') limit?: number,
  ): Promise<TopArtistMetric[]> {
    const parsedLimit = limit ? parseInt(limit.toString(), 10) : 10;
    return this.artistMetricsService.getTopArtists(parsedLimit);
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
