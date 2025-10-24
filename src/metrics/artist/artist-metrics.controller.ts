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
  @Get()
  async getAllArtistsMetrics() {
    return this.artistMetricsService.getAllArtistsMetrics();
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
}
