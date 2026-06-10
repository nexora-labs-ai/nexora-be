import { Injectable, Inject, Logger } from '@nestjs/common';
import { AI_PORT, AiPort } from '../../../shared/infrastructure/ports/ai.port';
import { PrismaService } from '../../../shared/database/prisma.service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConversation(userId: string, groupId?: string) {
    return this.prisma.aiConversation.findFirst({
      where: { userId, groupId: groupId ?? null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async appendMessage(
    userId: string,
    message: ChatMessage,
    groupId?: string,
  ) {
    const conversation = await this.getConversation(userId, groupId);

    if (conversation) {
      const messages = (conversation.messages as unknown) as ChatMessage[];
      const updated = [...messages, message].slice(-50); // Keep last 50 messages

      return this.prisma.aiConversation.update({
        where: { id: conversation.id },
        data: { messages: updated as unknown as object[] },
      });
    }

    return this.prisma.aiConversation.create({
      data: {
        userId,
        groupId,
        messages: [message] as unknown as object[],
      },
    });
  }

  async getHistory(userId: string, groupId?: string): Promise<ChatMessage[]> {
    const conversation = await this.getConversation(userId, groupId);
    return (conversation?.messages as unknown as ChatMessage[]) ?? [];
  }

  async clearHistory(userId: string, groupId?: string) {
    await this.prisma.aiConversation.deleteMany({
      where: { userId, groupId: groupId ?? null },
    });
  }
}
