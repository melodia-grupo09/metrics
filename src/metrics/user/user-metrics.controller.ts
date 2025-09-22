import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UserMetricsService } from './user-metrics.service';
import { UserRegistrationDto } from '../dto/user-registration.dto';

@ApiTags('user-metrics')
@Controller('metrics/users')
export class UserMetricsController {
  constructor(private readonly userMetricsService: UserMetricsService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: UserRegistrationDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  @ApiResponse({ status: 400, description: 'User already registered' })
  @Post('register')
  async registerUser(@Body() userRegistrationDto: UserRegistrationDto) {
    return this.userMetricsService.registerUser(
      userRegistrationDto.userId,
      userRegistrationDto.email,
    );
  }

  @ApiOperation({ summary: 'Update user activity' })
  @ApiResponse({
    status: 200,
    description: 'User activity updated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Post(':userId/activity')
  async updateUserActivity(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.userMetricsService.updateUserActivity(userId);
  }

  @ApiOperation({ summary: 'Get new user registrations' })
  @ApiResponse({
    status: 200,
    description: 'New registrations retrieved successfully',
  })
  @Get('registrations')
  async getNewRegistrations(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.userMetricsService.getNewRegistrations(start, end);
  }
}
