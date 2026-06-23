import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationType } from '@prisma/client';
import { buildPaginationMeta, buildPrismaSkipTake } from '../../shared/common/pagination';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserNotifications(userId: string, page: number, limit: number) {
    const where = { userId };
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...buildPrismaSkipTake(page, limit),
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async create(data: {
    userId: string;
    groupId?: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({
      data: { ...data, data: data.data as object | undefined },
    });
  }

  async createMany(
    notifications: {
      userId: string;
      groupId?: string;
      type: NotificationType;
      title: string;
      body: string;
    }[],
  ) {
    return this.prisma.notification.createMany({ data: notifications });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async updatePayload(id: string, payload: Prisma.InputJsonObject) {
    return this.prisma.notification.update({
      where: { id },
      data: { data: payload },
    });
  }
}
