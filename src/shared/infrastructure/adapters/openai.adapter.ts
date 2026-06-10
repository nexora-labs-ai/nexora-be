import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiPort,
  AiCompletionRequest,
  AiCompletionResponse,
  AiEmbeddingRequest,
  AiEmbeddingResponse,
  AiStreamRequest,
} from '../ports/ai.port';

@Injectable()
export class OpenAiAdapter implements AiPort {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly embeddingModel: string;
  private readonly logger = new Logger(OpenAiAdapter.name);

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
    this.model = this.configService.get<string>('openai.model') ?? 'gpt-4-turbo-preview';
    this.embeddingModel =
      this.configService.get<string>('openai.embeddingModel') ?? 'text-embedding-3-small';
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.userPrompt });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: request.maxTokens ?? this.configService.get('openai.maxTokens'),
      temperature: request.temperature ?? 0.7,
    });

    const choice = response.choices[0];

    return {
      content: choice.message.content ?? '',
      tokensUsed: response.usage?.total_tokens ?? 0,
      model: response.model,
    };
  }

  async stream(request: AiStreamRequest): Promise<void> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.userPrompt });

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
      max_tokens: request.maxTokens,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        request.onChunk(content);
      }
    }
  }

  async embed(request: AiEmbeddingRequest): Promise<AiEmbeddingResponse> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: request.text,
    });

    return {
      embedding: response.data[0].embedding,
      tokensUsed: response.usage.total_tokens,
    };
  }
}
