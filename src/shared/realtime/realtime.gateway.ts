import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';

export const REALTIME_EVENTS = {
  // Expense events
  EXPENSE_CREATED: 'expense.created',
  EXPENSE_UPDATED: 'expense.updated',
  EXPENSE_DELETED: 'expense.deleted',

  // Settlement events
  SETTLEMENT_REQUESTED: 'settlement.requested',
  SETTLEMENT_COMPLETED: 'settlement.completed',

  // Notification events
  NOTIFICATION: 'notification',

  // AI events
  AI_RESPONSE_CHUNK: 'ai.response.chunk',
  AI_RESPONSE_DONE: 'ai.response.done',
  RECOMMENDATION_READY: 'recommendation.ready',
  ITINERARY_READY: 'itinerary.ready',
} as const;

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') ?? '*',
    credentials: true,
  },
  namespace: '/ws',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-group')
  handleJoinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ): void {
    client.join(`group:${data.groupId}`);
    this.logger.debug(`Client ${client.id} joined group:${data.groupId}`);
  }

  @SubscribeMessage('leave-group')
  handleLeaveGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ): void {
    client.leave(`group:${data.groupId}`);
  }
}
