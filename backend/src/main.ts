import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable shutdown hooks for graceful exit (e.g. BullMQ, TypeORM)
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  const port = configService.get<number>('APP_PORT', 3001);
  await app.listen(port);
  
  Logger.log(`Backend is running on http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
