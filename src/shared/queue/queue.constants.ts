export const QUEUES = {
  NOTIFICATIONS: 'notifications',
  AI_JOBS: 'ai-jobs',
  EXPORTS: 'exports',
} as const;

export const JOB_NAMES = {
  // Notification jobs
  SEND_NOTIFICATION: 'send-notification',
  SEND_BULK_NOTIFICATIONS: 'send-bulk-notifications',

  // AI jobs
  GENERATE_RECOMMENDATION: 'generate-recommendation',
  BUDGET_ANALYSIS: 'budget-analysis',
  GENERATE_ITINERARY: 'generate-itinerary',

  // Export jobs
  EXPORT_EXPENSES: 'export-expenses',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
