import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { NotificationType } from '@prisma/client';
import { Queue } from 'bullmq';
import { JOB_NAMES, QUEUES } from '../../shared/queue/queue.constants';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { EXPENSE_EVENTS, ExpenseCreatedEvent } from '../expenses/domain/expense.events';
import {
  GROUP_EVENTS,
  GroupInvitationRespondedEvent,
  GroupInvitedEvent,
  MemberAddedEvent,
} from '../groups/domain/group.events';
import { SETTLEMENT_EVENTS } from '../settlements/settlements.service';
import { NotificationsRepository } from './notifications.repository';

export type GroupInviteNotificationPayload = {
  token: string;
  status?: 'ACCEPTED' | 'REJECTED';
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly realtimeService: RealtimeService,
    @InjectQueue(QUEUES.NOTIFICATIONS) private readonly notificationsQueue: Queue,
  ) {}

  async getUserNotifications(userId: string, page: number, limit: number) {
    return this.notificationsRepository.findUserNotifications(userId, page, limit);
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.notificationsRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string) {
    return this.notificationsRepository.markAllAsRead(userId);
  }

  async getUnreadCount(userId: string) {
    return this.notificationsRepository.getUnreadCount(userId);
  }

  async sendToUser(data: {
    userId: string;
    groupId?: string;
    type: NotificationType;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
  }) {
    const notification = await this.notificationsRepository.create({
      userId: data.userId,
      groupId: data.groupId,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.payload,
    });

    // Push realtime notification
    this.realtimeService.notifyUser(data.userId, notification);

    return notification;
  }

  // ============================================================
  // Domain Event Listeners
  // ============================================================

  @OnEvent(EXPENSE_EVENTS.CREATED)
  async onExpenseCreated(event: ExpenseCreatedEvent) {
    // Queue notification job for split participants
    await this.notificationsQueue.add(JOB_NAMES.SEND_BULK_NOTIFICATIONS, {
      type: NotificationType.EXPENSE_CREATED,
      userIds: event.splitUserIds.filter((id) => id !== event.payerId),
      title: 'New expense added',
      body: `A new expense of ${event.currency} ${event.amount} was added to your group`,
      groupId: event.groupId,
    });
  }

  @OnEvent(SETTLEMENT_EVENTS.COMPLETED)
  async onSettlementCompleted(event: unknown) {
    const settlement = event as {
      toUserId: string;
      fromUserId: string;
      groupId: string;
      amount: number;
      currency: string;
    };
    await this.sendToUser({
      userId: settlement.fromUserId,
      groupId: settlement.groupId,
      type: NotificationType.SETTLEMENT_COMPLETED,
      title: 'Settlement confirmed',
      body: `Your payment of ${settlement.currency} ${settlement.amount} has been confirmed`,
    });
  }

  @OnEvent(GROUP_EVENTS.MEMBER_ADDED)
  async onMemberAdded(event: MemberAddedEvent) {
    await this.sendToUser({
      userId: event.addedUserId,
      groupId: event.groupId,
      type: NotificationType.GROUP_INVITE,
      title: 'You were added to a group',
      body: 'You have been added to a new group',
    });
  }

  @OnEvent(GROUP_EVENTS.INVITED)
  async onGroupInvited(event: GroupInvitedEvent) {
    await this.sendToUser({
      userId: event.targetUserId,
      groupId: event.groupId,
      type: NotificationType.GROUP_INVITE,
      title: `Invitation to join ${event.groupName}`,
      body: `${event.inviterEmail} has invited you to join the group "${event.groupName}".`,
      payload: { token: event.token },
    });
  }

  @OnEvent(GROUP_EVENTS.INVITATION_RESPONDED)
  async onGroupInvitationResponded(event: GroupInvitationRespondedEvent) {
    // Find notification by token inside data
    const res = await this.notificationsRepository.findUserNotifications(event.userId, 1, 100);
    const notifications = res.data;

    for (const notif of notifications) {
      if (notif.type === NotificationType.GROUP_INVITE) {
        const payload = notif.data as GroupInviteNotificationPayload;
        if (payload?.token === event.token) {
          // Update payload to include status
          const newPayload: GroupInviteNotificationPayload = {
            ...payload,
            status: event.status,
          };
          await this.notificationsRepository.updatePayload(notif.id, newPayload);
        }
      }
    }
  }
}
