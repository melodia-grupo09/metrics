import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsEmail } from 'class-validator';

export class UserRegistrationDto {
  @ApiProperty({
    description: 'User ID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;
}
