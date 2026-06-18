import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuditService } from './audit/audit.service';
import { HealthController } from './health/health.controller';
import { AppLogger } from './logging/app-logger.service';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [AuditService, AppLogger],
  exports: [AuditService, AppLogger],
})
export class ObservabilityModule {}
