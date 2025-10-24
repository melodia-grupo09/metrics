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
