import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CategoriesService } from './categories/categories.service';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

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

  // Swagger API docs — only in non-production environments
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AuctionHouse API')
      .setDescription(
        'Real-time bidding marketplace API. Use the Authorize button to set your JWT token.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'JWT',
      )
      .addTag('auth', 'Authentication & authorization')
      .addTag('auctions', 'Auction management & bidding')
      .addTag('bids', 'Bid history')
      .addTag('users', 'User profiles & social features')
      .addTag('notifications', 'User notifications')
      .addTag('watchlist', 'Auction watchlist')
      .addTag('admin', 'Admin-only operations')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // keeps the JWT across page refreshes
      },
    });

    Logger.log('Swagger docs available at http://localhost:' + port + '/api/docs', 'Bootstrap');
  }

  await app.listen(port);

  Logger.log(`Backend is running on http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
