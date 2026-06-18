import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  name: process.env.APP_NAME ?? 'nexora-be',
  url: process.env.APP_URL ?? 'http://localhost:3000',
  corsOrigins: process.env.CORS_ORIGINS ?? 'http://localhost:3001',
  throttleTtl: Number.parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
  throttleLimit: Number.parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
}));
