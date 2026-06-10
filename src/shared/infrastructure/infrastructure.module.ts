import { Global, Module } from '@nestjs/common';
import { AI_PORT } from './ports/ai.port';
import { STORAGE_PORT } from './ports/storage.port';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { AwsS3Adapter } from './adapters/aws-s3.adapter';

@Global()
@Module({
  providers: [
    { provide: AI_PORT, useClass: OpenAiAdapter },
    { provide: STORAGE_PORT, useClass: AwsS3Adapter },
  ],
  exports: [AI_PORT, STORAGE_PORT],
})
export class InfrastructureModule {}
