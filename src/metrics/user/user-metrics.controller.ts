import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UserMetricsService } from './user-metrics.service';

@ApiTags('user-metrics')
@Controller('metrics/users')
export class UserMetricsController {
  constructor(private readonly userMetricsService: UserMetricsService) {}

  // Event recording endpoints - Simple like song metrics
  @ApiOperation({ summary: 'Record user registration' })
  @ApiResponse({
    status: 201,
    description: 'User registration recorded',
  })
  @Post(':userId/registration')
  recordRegistration(
    @Param('userId') userId: string,
    @Body() metadata?: Record<string, any>,
  ) {
    return this.userMetricsService.recordRegistration(userId, metadata);
  }

  @ApiOperation({ summary: 'Record user login' })
  @ApiResponse({
    status: 201,
    description: 'User login recorded',
  })
  @Post(':userId/login')
  recordLogin(
    @Param('userId') userId: string,
    @Body() metadata?: Record<string, any>,
  ) {
    return this.userMetricsService.recordLogin(userId, metadata);
  }

  @ApiOperation({ summary: 'Record user activity' })
  @ApiResponse({
    status: 201,
    description: 'User activity recorded',
  })
  @Post(':userId/activity')
  recordActivity(
    @Param('userId') userId: string,
    @Body() metadata?: Record<string, any>,
  ) {
    return this.userMetricsService.recordActivity(userId, metadata);
  }

  // Analytics endpoints - The 3 key metrics
  @ApiOperation({ summary: 'Get new registrations' })
  @ApiQuery({ name: 'startDate', required: true, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2024-12-31' })
  @ApiResponse({
    status: 200,
    description: 'New registrations count retrieved',
  })
  @Get('analytics/registrations')
  getNewRegistrations(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.userMetricsService.getNewRegistrations(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @ApiOperation({ summary: 'Get active users' })
  @ApiQuery({ name: 'startDate', required: true, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2024-12-31' })
  @ApiResponse({
    status: 200,
    description: 'Active users count retrieved',
  })
  @Get('analytics/active')
  getActiveUsers(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.userMetricsService.getActiveUsers(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @ApiOperation({ summary: 'Get user retention' })
  @ApiQuery({
    name: 'cohortStartDate',
    required: true,
    example: '2024-01-01',
  })
  @ApiQuery({ name: 'cohortEndDate', required: true, example: '2024-01-31' })
  @ApiQuery({
    name: 'daysAfter',
    required: false,
    example: 7,
    description: 'Days after registration to check retention',
  })
  @ApiResponse({
    status: 200,
    description: 'User retention metrics retrieved',
  })
  @Get('analytics/retention')
  getUserRetention(
    @Query('cohortStartDate') cohortStartDate: string,
    @Query('cohortEndDate') cohortEndDate: string,
    @Query('daysAfter', new DefaultValuePipe(7), ParseIntPipe)
    daysAfter: number,
  ) {
    return this.userMetricsService.getUserRetention(
      new Date(cohortStartDate),
      new Date(cohortEndDate),
      daysAfter,
    );
  }

  @ApiOperation({ summary: 'Get user content preferences and listening stats' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    description: 'Unique identifier for the user',
    example: 'user-123',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    example: '2024-01-01',
    description: 'Start date for filtering (optional)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    example: '2024-12-31',
    description: 'End date for filtering (optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'User content analytics retrieved',
    schema: {
      example: {
        userId: 'user-123',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
        topSongs: [
          { songId: 'song-456', plays: 45 },
          { songId: 'song-789', plays: 32 },
        ],
        topArtists: [
          { artistId: 'artist-123', totalPlays: 156 },
          { artistId: 'artist-456', totalPlays: 89 },
        ],
        listeningStats: {
          totalPlays: 287,
          estimatedHours: 16.74,
        },
      },
    },
  })
  @Get(':userId/analytics/content')
  getUserContentAnalytics(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.userMetricsService.getUserContentAnalytics(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @ApiOperation({ summary: 'Get user activity patterns' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    description: 'Unique identifier for the user',
    example: 'user-123',
  })
  @ApiResponse({
    status: 200,
    description: 'User activity patterns retrieved',
    schema: {
      example: {
        userId: 'user-123',
        activityPatterns: {
          peakHours: [
            { hour: 20, count: 45 },
            { hour: 14, count: 32 },
            { hour: 9, count: 28 },
          ],
          totalActivities: 287,
          activeDays: 35,
          averageActivitiesPerDay: 8.2,
        },
      },
    },
  })
  @Get(':userId/analytics/patterns')
  getUserActivityPatterns(@Param('userId') userId: string) {
    return this.userMetricsService.getUserActivityPatterns(userId);
  }

  @ApiOperation({ summary: 'Delete user metrics' })
  @ApiResponse({
    status: 200,
    description: 'User metrics deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    description: 'Unique identifier for the user',
    example: 'user-123',
  })
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  deleteUser(@Param('userId') userId: string) {
    return this.userMetricsService.deleteUser(userId);
  }
}
