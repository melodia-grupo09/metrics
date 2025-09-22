import { Controller, Get, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // Album endpoints
  @ApiOperation({ summary: 'Create a new album' })
  @ApiResponse({
    status: 201,
    description: 'Album created successfully',
  })
  @ApiResponse({ status: 400, description: 'Album already exists' })
  @Post('albums/:albumId')
  async createAlbum(@Param('albumId', ParseUUIDPipe) albumId: string) {
    return this.metricsService.createAlbum(albumId);
  }

  @ApiOperation({ summary: 'Increment album likes' })
  @ApiResponse({ status: 200, description: 'Album like recorded successfully' })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @Post('albums/:albumId/likes')
  async incrementAlbumLikes(@Param('albumId', ParseUUIDPipe) albumId: string) {
    return this.metricsService.incrementAlbumLikes(albumId);
  }

  @ApiOperation({ summary: 'Increment album shares' })
  @ApiResponse({
    status: 200,
    description: 'Album share recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @Post('albums/:albumId/shares')
  async incrementAlbumShares(@Param('albumId', ParseUUIDPipe) albumId: string) {
    return this.metricsService.incrementAlbumShares(albumId);
  }

  @ApiOperation({ summary: 'Get album metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @Get('albums/:albumId')
  async getAlbumMetrics(@Param('albumId', ParseUUIDPipe) albumId: string) {
    return this.metricsService.getAlbumMetrics(albumId);
  }
}
