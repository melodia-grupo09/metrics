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
  Header,
} from '@nestjs/common';
import {
  ArtistMetricsService,
  TopArtistMetric,
} from './artist-metrics.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('artist-metrics')
@Controller('metrics/artists')
export class ArtistMetricsController {
  constructor(private readonly artistMetricsService: ArtistMetricsService) {}

  @ApiOperation({ summary: 'Create a new artist' })
  @ApiResponse({
    status: 201,
    description: 'Artist created successfully',
  })
  @ApiResponse({ status: 400, description: 'Artist already exists' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        artistId: {
          type: 'string',
          description: 'Unique identifier for the artist',
          example: 'artist-123',
        },
      },
      required: ['artistId'],
    },
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createArtist(@Body('artistId') artistId: string) {
    return this.artistMetricsService.createArtist(artistId);
  }

  @ApiOperation({ summary: 'Add a listener to an artist' })
  @ApiResponse({
    status: 200,
    description: 'Artist listener recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  @ApiParam({
    name: 'artistId',
    type: 'string',
    description: 'Unique identifier for the artist',
    example: 'artist-123',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'Unique identifier for the user',
          example: 'user-456',
        },
      },
      required: ['userId'],
    },
  })
  @Post(':artistId/listeners')
  @HttpCode(HttpStatus.OK)
  async addListener(
    @Param('artistId') artistId: string,
    @Body('userId') userId: string,
  ) {
    return this.artistMetricsService.addListener(artistId, userId);
  }

  @ApiOperation({ summary: 'Get monthly listeners for an artist' })
  @ApiResponse({
    status: 200,
    description: 'Monthly listeners retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  @ApiParam({
    name: 'artistId',
    type: 'string',
    description: 'Unique identifier for the artist',
    example: 'artist-123',
  })
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

  @ApiOperation({ summary: 'Get metrics for all artists' })
  @ApiResponse({
    status: 200,
    description: 'All artists metrics retrieved successfully',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    description: 'Time period for metrics (default: monthly)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for custom period (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for custom period (ISO 8601)',
  })
  @Get()
  async getAllArtistsMetrics(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly' | 'custom',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsedPage = page ? parseInt(page.toString(), 10) : 1;
    const parsedLimit = limit ? parseInt(limit.toString(), 10) : 10;
    return this.artistMetricsService.getAllArtistsMetrics(
      parsedPage,
      parsedLimit,
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @ApiOperation({ summary: 'Delete an artist' })
  @ApiResponse({
    status: 200,
    description: 'Artist deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  @ApiParam({
    name: 'artistId',
    type: 'string',
    description: 'Unique identifier for the artist',
    example: 'artist-123',
  })
  @Delete(':artistId')
  @HttpCode(HttpStatus.OK)
  async deleteArtist(@Param('artistId') artistId: string) {
    return this.artistMetricsService.deleteArtist(artistId);
  }

  @ApiOperation({ summary: 'Add a follower to an artist' })
  @ApiResponse({
    status: 200,
    description: 'Artist follower recorded successfully',
  })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  @ApiParam({
    name: 'artistId',
    type: 'string',
    description: 'Unique identifier for the artist',
    example: 'artist-123',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'Unique identifier for the user',
          example: 'user-456',
        },
      },
      required: ['userId'],
    },
  })
  @Post(':artistId/followers')
  @HttpCode(HttpStatus.OK)
  async addFollower(
    @Param('artistId') artistId: string,
    @Body('userId') userId: string,
  ) {
    return this.artistMetricsService.addFollower(artistId, userId);
  }

  @ApiOperation({ summary: 'Remove a follower from an artist' })
  @ApiResponse({
    status: 200,
    description: 'Artist follower removed successfully',
  })
  @ApiResponse({ status: 404, description: 'Artist or follower not found' })
  @ApiParam({
    name: 'artistId',
    type: 'string',
    description: 'Unique identifier for the artist',
    example: 'artist-123',
  })
  @ApiParam({
    name: 'userId',
    type: 'string',
    description: 'Unique identifier for the user',
    example: 'user-456',
  })
  @Delete(':artistId/followers/:userId')
  @HttpCode(HttpStatus.OK)
  async removeFollower(
    @Param('artistId') artistId: string,
    @Param('userId') userId: string,
  ) {
    await this.artistMetricsService.removeFollower(artistId, userId);
  }

  @ApiOperation({ summary: 'Get artist metrics' })
  @ApiResponse({
    status: 200,
    description: 'Artist metrics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  @ApiParam({
    name: 'artistId',
    type: 'string',
    description: 'Unique identifier for the artist',
    example: 'artist-123',
  })
  @ApiQuery({
    name: 'region',
    required: false,
    type: 'string',
    description: 'Filter metrics by region',
    example: 'Argentina',
  })
  @Get(':artistId')
  async getArtistMetrics(
    @Param('artistId') artistId: string,
    @Query('region') region?: string,
  ) {
    return this.artistMetricsService.getArtistMetrics(artistId, region);
  }

  @ApiOperation({ summary: 'Get top markets for an artist' })
  @ApiResponse({
    status: 200,
    description: 'Top markets retrieved successfully',
  })
  @ApiParam({
    name: 'artistId',
    type: 'string',
    description: 'Unique identifier for the artist',
    example: 'artist-123',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    description: 'Time period for metrics',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    description: 'Start date for custom period (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    description: 'End date for custom period (ISO 8601)',
  })
  @Get(':artistId/top-markets')
  async getTopMarkets(
    @Param('artistId') artistId: string,
    @Query('period')
    period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.artistMetricsService.getTopMarkets(
      artistId,
      period,
      start,
      end,
    );
  }

  @ApiOperation({ summary: 'Get top songs for an artist' })
  @ApiResponse({
    status: 200,
    description: 'Top songs retrieved successfully',
  })
  @ApiParam({
    name: 'artistId',
    type: 'string',
    description: 'Unique identifier for the artist',
    example: 'artist-123',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    description: 'Time period for metrics',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    description: 'Start date for custom period (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    description: 'End date for custom period (ISO 8601)',
  })
  @ApiQuery({
    name: 'region',
    required: false,
    type: 'string',
    description: 'Filter by region',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['plays', 'likes'],
    description: 'Sort by metric (default: plays)',
  })
  @Get(':artistId/top-songs')
  async getTopSongs(
    @Param('artistId') artistId: string,
    @Query('period')
    period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('region') region?: string,
    @Query('sortBy') sortBy: 'plays' | 'likes' = 'plays',
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.artistMetricsService.getTopSongs(
      artistId,
      period,
      start,
      end,
      region,
      sortBy,
    );
  }

  @ApiOperation({ summary: 'Export metrics for all artists as CSV' })
  @ApiResponse({
    status: 200,
    description: 'CSV file exported successfully',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    description: 'Time period for metrics (default: monthly)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for custom period (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for custom period (ISO 8601)',
  })
  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="artists_metrics.csv"')
  async exportArtistsMetrics(
    @Query('period') period?: 'daily' | 'weekly' | 'monthly' | 'custom',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.artistMetricsService.getArtistsMetricsCsv(
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
