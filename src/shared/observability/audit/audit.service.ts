import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface AuditEntry {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  private logger = new Logger(AuditService.name);

  async log(entry: AuditEntry): Promise<void> {
    this.logger.log(`Audit: ${entry.action} on ${entry.entity}`);
  }

  async getByEntity(entity: string, entityId: string) {
    return [];
  }
}
