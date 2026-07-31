import { WsJwtGuard } from '@/shared/common/guards/ws-jwt.guard';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JoinChatDto, SendMessageDto } from './dto/group-chat.dto';
import { GroupChatService } from './group-chat.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') ?? '*',
    credentials: true,
  },
  namespace: '/ws',
})
@UsePipes(new ValidationPipe({ transform: true }))
export class GroupChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GroupChatGateway.name);

  constructor(private readonly groupChatService: GroupChatService) {}

  @UseGuards(WsJwtGuard)
  handleConnection(client: Socket): void {
    this.logger.debug(`Chat Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Chat Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join-chat')
  async handleJoinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinChatDto,
  ): Promise<void> {
    try {
      const user = client.data.user;
      if (!user) return;

      // Ensure user is a member before allowing them to listen
      await this.groupChatService.checkMembership(data.groupId, user.id);

      client.join(`chat:${data.groupId}`);
      this.logger.debug(`Client ${client.id} joined chat:${data.groupId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.warn(`Failed to join chat: ${errorMessage}`);
      client.emit('error', { message: 'Failed to join chat', details: errorMessage });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave-chat')
  handleLeaveGroup(@ConnectedSocket() client: Socket, @MessageBody() data: JoinChatDto): void {
    client.leave(`chat:${data.groupId}`);
    this.logger.debug(`Client ${client.id} left chat:${data.groupId}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ): Promise<void> {
    try {
      const user = client.data.user;
      this.logger.debug(
        `Client ${client.id} (User: ${user?.id}) sending message to group: ${data.groupId}`,
      );
      if (!user) {
        this.logger.warn('Unauthenticated user tried to send message');
        return;
      }

      // Save to database
      const message = await this.groupChatService.saveMessage(data.groupId, user.id, data.content);

      // Broadcast to group room
      this.server.to(`chat:${data.groupId}`).emit('new-message', message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error sending message: ${errorMessage}`);
      client.emit('error', { message: 'Failed to send message', details: errorMessage });
    }
  }
}
