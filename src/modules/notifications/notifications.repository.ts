import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { buildPaginationMeta, buildPrismaSkipTake } from '../../shared/common/pagination';
import { PrismaService } from '../../shared/database/prisma.service';
import { GroupInviteNotificationPayload } from './notifications.service';

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
    return {
      data: data.map((item) => {
        return {
          ...item,
          data: item.data as GroupInviteNotificationPayload,
        };
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
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
      data?: Record<string, unknown>;
    }[],
  ) {
    return this.prisma.$transaction(
      notifications.map((n) =>
        this.prisma.notification.create({
          data: { ...n, data: n.data as object | undefined },
        }),
      ),
    );
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

  async updateInviteStatusByToken(userId: string, token: string, status: 'ACCEPTED' | 'REJECTED') {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        type: NotificationType.GROUP_INVITE,
        data: { path: ['token'], equals: token },
      },
    });

    for (const notif of notifications) {
      const payload = notif.data as Record<string, unknown>;
      if (payload) {
        await this.prisma.notification.update({
          where: { id: notif.id },
          data: { data: { ...payload, status } },
        });
      }
    }
  }
}
