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
          // Connection pool settings for better performance
          maxPoolSize: 5, // Smaller pool for Heroku
          minPoolSize: 1,
          maxIdleTimeMS: 60000, // Keep connections alive longer
          // Faster connection but still robust
          serverSelectionTimeoutMS: 30000, // Keep default but ensure connection
          heartbeatFrequencyMS: 10000, // Check connection health more often
          // Retry settings for reliability
          retryWrites: true,
          retryReads: true,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
