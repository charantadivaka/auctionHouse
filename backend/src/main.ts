import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CategoriesService } from './categories/categories.service';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable shutdown hooks for graceful exit (e.g. BullMQ, TypeORM)
  app.enableShutdownHooks();

  // Security: Helmet sets various HTTP headers to protect against well known vulnerabilities
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // FEAT-02: Seed default categories on every startup (idempotent)
  try {
    const categoriesService = app.get(CategoriesService);
    await categoriesService.seedDefaultCategories();
    Logger.log('Default categories seeded successfully', 'Bootstrap');
  } catch (e: any) {
    Logger.warn(`Category seeding skipped: ${e.message}`, 'Bootstrap');
  }

  const port = configService.get<number>('APP_PORT', 3001);
  await app.listen(port);

  Logger.log(`Backend is running on http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
