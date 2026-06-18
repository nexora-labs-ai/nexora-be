import { registerAs } from '@nestjs/config';

export default registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL ?? 'gpt-4-turbo-preview',
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
  maxTokens: Number.parseInt(process.env.OPENAI_MAX_TOKENS ?? '4096', 10),
}));
