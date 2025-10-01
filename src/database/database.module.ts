import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const mongoUri =
          configService.get<string>('MONGODB_URI') ||
          'mongodb://admin:admin@localhost:27017/metrics?authSource=admin';

        return {
          uri: mongoUri,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
