import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { SendNotificationProcessor } from './jobs/send-notification.processor';
import { QUEUES } from '../../shared/queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.NOTIFICATIONS })],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository, SendNotificationProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
