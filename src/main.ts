import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const microservice =
    await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
        queue: 'metrics_queue',
        queueOptions: { durable: true },
        exchange: 'metrics_exchange',
        exchangeType: 'topic',
        noAck: false,
      },
    });

  await microservice.listen();
  await app.listen(process.env.PORT ?? 3000);
  logger.log(`Application listening on port ${process.env.PORT ?? 3000}`);
}

bootstrap().catch((err: Error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Failed to start application: ${err}`, err.stack);
  process.exit(1);
});
