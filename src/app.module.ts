import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';

import appConfig from './shared/config/app.config';
import awsConfig from './shared/config/aws.config';
import databaseConfig from './shared/config/database.config';
import { validateEnv } from './shared/config/env.validation';
import jwtConfig from './shared/config/jwt.config';
import mezonConfig from './shared/config/mezon.config';
import openaiConfig from './shared/config/openai.config';
import redisConfig from './shared/config/redis.config';

import { JwtAuthGuard } from './shared/common/guards/jwt-auth.guard';
import { PrismaModule } from './shared/database/prisma.module';
import { CacheModule } from './shared/infrastructure/cache/cache.module';
import { InfrastructureModule } from './shared/infrastructure/infrastructure.module';
import { winstonConfig } from './shared/observability/logging/winston.config';
import { ObservabilityModule } from './shared/observability/observability.module';
import { QueueModule } from './shared/queue/queue.module';
import { RealtimeModule } from './shared/realtime/realtime.module';

import { AiModule } from './modules/ai/ai.module';
// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ItineraryModule } from './modules/itinerary/itinerary.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        awsConfig,
        openaiConfig,
        mezonConfig,
      ],
      envFilePath: ['.env.local', '.env'],
      cache: true,
      validate: validateEnv,
    }),

    // Structured logging (global)
    WinstonModule.forRootAsync({
      useFactory: winstonConfig,
    }),

    // Event emitter for domain events
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          { ttl: 60000, limit: 100 }, // 100 req/min default
          { name: 'strict', ttl: 60000, limit: 20 }, // 20 req/min strict
        ],
      }),
    }),

    // Cron jobs
    ScheduleModule.forRoot(),

    // Shared infrastructure
    PrismaModule,
    CacheModule,
    QueueModule,
    RealtimeModule,
    ObservabilityModule,
    InfrastructureModule,

    // Feature modules
    AuthModule,
    UsersModule,
    GroupsModule,
    ExpensesModule,
    SettlementsModule,
    NotificationsModule,
    ItineraryModule,
    RecommendationsModule,
    AiModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
