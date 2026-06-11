import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';

import appConfig from './shared/config/app.config';
import databaseConfig from './shared/config/database.config';
import redisConfig from './shared/config/redis.config';
import jwtConfig from './shared/config/jwt.config';
import awsConfig from './shared/config/aws.config';
import openaiConfig from './shared/config/openai.config';
import { validateEnv } from './shared/config/env.validation';

import { PrismaModule } from './shared/database/prisma.module';
import { CacheModule } from './shared/infrastructure/cache/cache.module';
import { QueueModule } from './shared/queue/queue.module';
import { RealtimeModule } from './shared/realtime/realtime.module';
import { ObservabilityModule } from './shared/observability/observability.module';
import { InfrastructureModule } from './shared/infrastructure/infrastructure.module';
import { winstonConfig } from './shared/observability/logging/winston.config';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PollsModule } from './modules/polls/polls.module';
import { ItineraryModule } from './modules/itinerary/itinerary.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, awsConfig, openaiConfig],
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
          { ttl: 60000, limit: 100 },  // 100 req/min default
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
    PollsModule,
    ItineraryModule,
    RecommendationsModule,
    AiModule,
  ],
})
export class AppModule {}
