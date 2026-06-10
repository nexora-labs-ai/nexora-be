import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { QUEUES, JOB_NAMES } from '../../../shared/queue/queue.constants';
import { NotificationsRepository } from '../notifications.repository';
import { RealtimeService } from '../../../shared/realtime/realtime.service';

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
    }>,
  ): Promise<void> {
    const { type, userIds, title, body, groupId } = job.data;

    await this.notificationsRepository.createMany(
      userIds.map((userId) => ({ userId, type, title, body, groupId })),
    );

    // Push realtime to each user
    for (const userId of userIds) {
      this.realtimeService.notifyUser(userId, { type, title, body, groupId });
    }

    this.logger.debug(`Sent ${userIds.length} notifications of type ${type}`);
  }
}
