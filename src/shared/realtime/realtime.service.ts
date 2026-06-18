import { Injectable } from '@nestjs/common';
import { REALTIME_EVENTS, RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitToUser(userId: string, event: string, data: unknown): void {
    this.gateway.server.to(`user:${userId}`).emit(event, data);
  }

  emitToGroup(groupId: string, event: string, data: unknown): void {
    this.gateway.server.to(`group:${groupId}`).emit(event, data);
  }

  emitToAll(event: string, data: unknown): void {
    this.gateway.server.emit(event, data);
  }

  notifyGroupExpenseCreated(groupId: string, expense: unknown): void {
    this.emitToGroup(groupId, REALTIME_EVENTS.EXPENSE_CREATED, expense);
  }

  notifyGroupSettlementCompleted(groupId: string, settlement: unknown): void {
    this.emitToGroup(groupId, REALTIME_EVENTS.SETTLEMENT_COMPLETED, settlement);
  }

  notifyUser(userId: string, notification: unknown): void {
    this.emitToUser(userId, REALTIME_EVENTS.NOTIFICATION, notification);
  }

  streamAiChunk(userId: string, chunk: string): void {
    this.emitToUser(userId, REALTIME_EVENTS.AI_RESPONSE_CHUNK, { chunk });
  }

  streamAiDone(userId: string): void {
    this.emitToUser(userId, REALTIME_EVENTS.AI_RESPONSE_DONE, {});
  }
}
