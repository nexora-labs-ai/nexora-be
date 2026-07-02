import { getQueueToken } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { QUEUES } from './queue.constants';

const mockQueueProvider = (queueName: string) => ({
  provide: getQueueToken(queueName),
  useValue: {
    add: async (name: string, data: any) => {
      console.log(`[Mock Queue ${queueName}] add job ${name}`);
      return { id: `mock-${Date.now()}` };
    },
    process: () => {},
    on: () => {},
  },
});

@Global()
@Module({
  providers: [
    mockQueueProvider(QUEUES.NOTIFICATIONS),
    mockQueueProvider(QUEUES.AI_JOBS),
    mockQueueProvider(QUEUES.EXPORTS),
  ],
  exports: [
    getQueueToken(QUEUES.NOTIFICATIONS),
    getQueueToken(QUEUES.AI_JOBS),
    getQueueToken(QUEUES.EXPORTS),
  ],
})
export class QueueModule {}
