import { Global, Module } from '@nestjs/common';
import { CloudinaryAdapter } from './adapters/cloudinary.adapter';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { AI_PORT } from './ports/ai.port';
import { STORAGE_PORT } from './ports/storage.port';

@Global()
@Module({
  providers: [
    { provide: AI_PORT, useClass: OpenAiAdapter },
    { provide: STORAGE_PORT, useClass: CloudinaryAdapter },
  ],
  exports: [AI_PORT, STORAGE_PORT],
})
export class InfrastructureModule {}
