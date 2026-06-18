import { Injectable, Logger } from '@nestjs/common';
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
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async appendMessage(userId: string, message: ChatMessage, groupId?: string) {
    let conversation = await this.getConversation(userId, groupId);

    if (!conversation) {
      conversation = await this.prisma.aiConversation.create({
        data: {
          userId,
          groupId: groupId ?? null,
        },
        include: { messages: true },
      });
    }

    const newMessage = await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: message.role,
        content: message.content,
      },
    });

    // Optionally cleanup old messages if there are too many,
    // but append usually just means creating a new record.

    return conversation;
  }

  async getHistory(userId: string, groupId?: string): Promise<ChatMessage[]> {
    const conversation = await this.getConversation(userId, groupId);
    if (!conversation) return [];
    return conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content ?? '',
    }));
  }

  async clearHistory(userId: string, groupId?: string) {
    await this.prisma.aiConversation.deleteMany({
      where: { userId, groupId: groupId ?? null },
    });
  }
}
