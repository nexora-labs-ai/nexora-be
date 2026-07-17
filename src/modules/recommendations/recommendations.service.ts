import * as crypto from 'node:crypto';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { RecommendationAiService } from '../ai/recommendation/recommendation.service';
import { GroupChatGateway } from '../group-chat/group-chat.gateway';
import { GroupChatService } from '../group-chat/group-chat.service';

export type RecommendationMetadata = Prisma.JsonObject & {
  batchId?: string;
  topic?: string;
};

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recommendationAiService: RecommendationAiService,
    private readonly groupChatGateway: GroupChatGateway,
    private readonly groupChatService: GroupChatService,
  ) {}

  async getGroupRecommendations(groupId: string, userId: string) {
    const recommendations = await this.prisma.recommendation.findMany({
      where: {
        groupId,
        OR: [{ expiresAt: { gte: new Date() } }, { expiresAt: null }],
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      include: {
        likes: {
          where: { userId },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    const result = recommendations.map((rec) => ({
      ...rec,
      isLiked: rec.likes.length > 0,
      likeCount: rec._count.likes,
    }));

    this.logger.debug(
      `getGroupRecommendations returning ${result.length} items for group ${groupId}`,
    );
    return result;
  }

  async triggerRecommendationGeneration(groupId: string, type: string, userId: string) {
    const batchId = crypto.randomUUID();

    // Notify all clients in the group that generation has started
    this.groupChatGateway.server
      .to(`chat:${groupId}`)
      .emit('recommendation-generating', { isGenerating: true });

    try {
      // We are generating synchronously now
      const created = await this.recommendationAiService.generatePlacesRecommendations(
        groupId,
        type,
        userId,
        batchId,
      );

      // Broadcast real-time event for UI update
      this.groupChatGateway.server.to(`chat:${groupId}`).emit('recommendations-generated', created);

      // Insert a system message so it appears in the chat bubble
      const payload = JSON.stringify({ batchId, topic: type });
      const message = await this.groupChatService.saveMessage(
        groupId,
        userId,
        `[RECOMMENDATION_SYSTEM_MESSAGE] ${payload}`,
      );
      this.groupChatGateway.server.to(`chat:${groupId}`).emit('new-message', message);

      return { message: 'Recommendation generation completed', count: created.length };
    } catch (e) {
      this.logger.error(
        'Failed to create recommendation system message or generate recommendations',
        e,
      );
      throw e;
    } finally {
      // Notify all clients that generation has ended (whether success or fail)
      this.groupChatGateway.server
        .to(`chat:${groupId}`)
        .emit('recommendation-generating', { isGenerating: false });
    }
  }

  // async triggerBudgetAnalysis(groupId: string) {
  //
  //   this.logger.log(`Budget analysis triggered for group ${groupId}`);
  //   return { message: 'Budget analysis triggered' };
  // }

  async markActedOn(id: string) {
    return this.prisma.recommendation.delete({
      where: { id },
    });
  }

  async deleteByBatchId(groupId: string, batchId: string) {
    // metadata is a JSON object, so we can't directly query by it easily in basic Prisma without raw query,
    // BUT we can use raw query, or fetch and delete.
    // Prisma supports JSON filtering in Postgres: `metadata: { path: ['batchId'], equals: batchId }`
    const recs = await this.prisma.recommendation.findMany({
      where: {
        groupId,
      },
      select: { id: true, metadata: true },
    });

    const idsToDelete = recs
      .filter((r) => {
        const meta = r.metadata as RecommendationMetadata;
        return meta && meta.batchId === batchId;
      })
      .map((r) => r.id);

    if (idsToDelete.length > 0) {
      await this.prisma.recommendation.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  }

  async likeRecommendation(id: string, userId: string) {
    const recommendation = await this.prisma.recommendation.findUnique({
      where: { id },
    });
    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    await this.prisma.recommendationLike.upsert({
      where: {
        recommendationId_userId: {
          recommendationId: id,
          userId,
        },
      },
      update: {},
      create: {
        recommendationId: id,
        userId,
      },
    });

    this.groupChatGateway.server.to(`chat:${recommendation.groupId}`).emit('recommendation-liked', {
      recommendationId: id,
      userId,
      action: 'like',
    });

    return { message: 'Liked recommendation' };
  }

  async unlikeRecommendation(id: string, userId: string) {
    let recommendation: { groupId: string } | null = null;
    try {
      recommendation = await this.prisma.recommendation.findUnique({
        where: { id },
        select: { groupId: true },
      });
      await this.prisma.recommendationLike.delete({
        where: {
          recommendationId_userId: {
            recommendationId: id,
            userId,
          },
        },
      });

      if (recommendation) {
        this.groupChatGateway.server
          .to(`chat:${recommendation.groupId}`)
          .emit('recommendation-liked', {
            recommendationId: id,
            userId,
            action: 'unlike',
          });
      }
    } catch (e) {
      // Ignore if it doesn't exist
    }

    return { message: 'Unliked recommendation' };
  }
}
