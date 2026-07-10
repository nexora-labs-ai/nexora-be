import { DomainError, ForbiddenError } from '@/shared/common/domain-errors';
import { PrismaService } from '@/shared/database/prisma.service';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class GroupChatService {
  private readonly logger = new Logger(GroupChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkMembership(groupId: string, userId: string): Promise<void> {
    const groupMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!groupMember) {
      throw new ForbiddenError('User is not a member of this group');
    }
  }

  async saveMessage(groupId: string, userId: string, content: string) {
    try {
      // Validate group membership
      await this.checkMembership(groupId, userId);

      const message = await this.prisma.groupMessage.create({
        data: {
          groupId,
          userId,
          content,
        },
        include: {
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
      return message;
    } catch (error) {
      this.logger.error(`Failed to save message for group ${groupId}:`, error);
      if (error instanceof DomainError) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to save group message');
    }
  }

  async getGroupMessages(groupId: string, limit = 50, before?: string) {
    const query: Prisma.GroupMessageFindManyArgs = {
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    };

    if (before) {
      query.cursor = { id: before };
      query.skip = 1; // Skip the cursor itself
    }

    try {
      const messages = await this.prisma.groupMessage.findMany(query);
      // Return in chronological order
      return messages.reverse();
    } catch (error) {
      this.logger.error(`Failed to get messages for group ${groupId}:`, error);
      throw new InternalServerErrorException('Failed to fetch group messages');
    }
  }
}
