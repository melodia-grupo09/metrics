import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AlbumMetricsService } from './album-metrics.service';
import { AlbumInteractionDto } from './dto/album-interaction.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

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
  createAlbum(@Param('albumId') albumId: string) {
    return this.albumMetricsService.createAlbum(albumId);
  }

  @ApiOperation({ summary: 'Increment album likes' })
  @ApiResponse({ status: 200, description: 'Album like recorded successfully' })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @Post(':albumId/likes')
  incrementAlbumLikes(
    @Param('albumId') albumId: string,
    @Body() interactionDto: AlbumInteractionDto,
  ) {
    return this.albumMetricsService.incrementAlbumLikes(
      albumId,
      interactionDto.artistId,
      interactionDto.userId,
    );
  }

  @ApiOperation({ summary: 'Increment album shares' })
  @ApiResponse({
    status: 200,
    description: 'Album share recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @Post(':albumId/shares')
  incrementAlbumShares(
    @Param('albumId') albumId: string,
    @Body() interactionDto: AlbumInteractionDto,
  ) {
    return this.albumMetricsService.incrementAlbumShares(
      albumId,
      interactionDto.artistId,
      interactionDto.userId,
    );
  }

  @ApiOperation({ summary: 'Get album metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @ApiBody({
    description: 'Optional array of song IDs to calculate total plays',
    required: false,
    schema: {
      type: 'object',
      properties: {
        songIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['song123', 'song456'],
        },
      },
    },
  })
  @Post(':albumId/metrics')
  async getAlbumMetrics(
    @Param('albumId') albumId: string,
    @Body('songIds') songIds?: string[],
  ) {
    return await this.albumMetricsService.getAlbumMetrics(albumId, songIds);
  }

  @ApiOperation({ summary: 'Get top albums by likes' })
  @ApiResponse({
    status: 200,
    description: 'Top albums retrieved successfully',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top albums to return (default: 10)',
  })
  @Get()
  async getTopAlbums(@Query('limit') limit?: number) {
    const parsedLimit = limit ? parseInt(limit.toString(), 10) : 10;
    return this.albumMetricsService.getTopAlbums(parsedLimit);
  }

  @ApiOperation({ summary: 'Delete an album' })
  @ApiResponse({
    status: 200,
    description: 'Album deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Album not found' })
  @ApiParam({
    name: 'albumId',
    type: 'string',
    description: 'Unique identifier for the album',
    example: 'album-123',
  })
  @Delete(':albumId')
  @HttpCode(HttpStatus.OK)
  async deleteAlbum(@Param('albumId') albumId: string) {
    return this.albumMetricsService.deleteAlbum(albumId);
  }
}
