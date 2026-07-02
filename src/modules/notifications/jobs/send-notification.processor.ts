import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { Job } from 'bullmq';
import { JOB_NAMES, QUEUES } from '../../../shared/queue/queue.constants';
import { RealtimeService } from '../../../shared/realtime/realtime.service';
import { NotificationsRepository } from '../notifications.repository';

@Processor(QUEUES.NOTIFICATIONS)
export class SendNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(SendNotificationProcessor.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly realtimeService: RealtimeService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_NAMES.SEND_BULK_NOTIFICATIONS:
        await this.handleBulkNotification(job);
        break;
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }

  private async handleBulkNotification(
    job: Job<{
      type: NotificationType;
      userIds: string[];
      title: string;
      body: string;
      groupId?: string;
      data?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    const { type, userIds, title, body, groupId, data } = job.data;

    const createdNotifications = await this.notificationsRepository.createMany(
      userIds.map((userId) => ({ userId, type, title, body, groupId, data })),
    );

    // Push realtime to each user
    for (const notification of createdNotifications) {
      this.realtimeService.notifyUser(notification.userId, notification);
    }

    this.logger.debug(`Sent ${userIds.length} notifications of type ${type}`);
  }
}
