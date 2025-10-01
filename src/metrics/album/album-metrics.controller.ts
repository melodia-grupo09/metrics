import { Controller, Get, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { AlbumMetricsService } from './album-metrics.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('album-metrics')
@Controller('metrics/albums')
export class AlbumMetricsController {
  constructor(private readonly albumMetricsService: AlbumMetricsService) {}

  @ApiOperation({ summary: 'Create a new album' })
  @ApiResponse({
    status: 201,
    description: 'Album created successfully',
  })
  @ApiResponse({ status: 400, description: 'Album already exists' })
  @Post(':albumId')
  async createAlbum(@Param('albumId', ParseUUIDPipe) albumId: string) {
    return this.albumMetricsService.createAlbum(albumId);
  }

  @ApiOperation({ summary: 'Increment album likes' })
  @ApiResponse({ status: 200, description: 'Album like recorded successfully' })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @Post(':albumId/likes')
  async incrementAlbumLikes(@Param('albumId', ParseUUIDPipe) albumId: string) {
    return this.albumMetricsService.incrementAlbumLikes(albumId);
  }

  @ApiOperation({ summary: 'Increment album shares' })
  @ApiResponse({
    status: 200,
    description: 'Album share recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @Post(':albumId/shares')
  async incrementAlbumShares(@Param('albumId', ParseUUIDPipe) albumId: string) {
    return this.albumMetricsService.incrementAlbumShares(albumId);
  }

  @ApiOperation({ summary: 'Get album metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @Get(':albumId')
  async getAlbumMetrics(@Param('albumId', ParseUUIDPipe) albumId: string) {
    return this.albumMetricsService.getAlbumMetrics(albumId);
  }
}
