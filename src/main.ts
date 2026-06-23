import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/common/filters/global-exception.filter';
import { ResponseInterceptor } from './shared/common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  // Use structured logger
  app.useLogger(logger);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: configService.get<string>('app.corsOrigins')?.split(',') ?? '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-API-Key', 'X-Client'],
  });

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // Swagger (non-production only)
  if (configService.get('app.nodeEnv') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Nexora API')
      .setDescription('Enterprise-grade expense-sharing & trip planning API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & Authorization')
      .addTag('users', 'User management')
      .addTag('groups', 'Group management')
      .addTag('expenses', 'Expense management')
      .addTag('settlements', 'Settlement management')
      .addTag('notifications', 'Notifications')
      .addTag('itinerary', 'Trip itinerary')
      .addTag('recommendations', 'AI recommendations')
      .addTag('ai', 'AI assistant')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = configService.get<number>('app.port') ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Nexora API running on http://localhost:${port}/api`, 'Bootstrap');
  logger.log(`📚 Swagger docs at http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap();
