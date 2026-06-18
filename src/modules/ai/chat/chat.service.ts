import { Inject, Injectable, Logger } from '@nestjs/common';
import { AI_PORT, AiPort } from '../../../shared/infrastructure/ports/ai.port';
import { RealtimeService } from '../../../shared/realtime/realtime.service';
import { ChatMessage, MemoryService } from '../memory/memory.service';

export interface ChatRequest {
  userId: string;
  groupId?: string;
  message: string;
  stream?: boolean;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  private readonly systemPrompt =
    `You are Nexora AI, a friendly financial and travel planning assistant.
You help groups manage expenses, plan trips, and make smart financial decisions together.
Be concise, helpful, and proactive with suggestions.
Always consider the group context when giving advice.`;

  constructor(
    @Inject(AI_PORT) private readonly aiPort: AiPort,
    private readonly memoryService: MemoryService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async chat(request: ChatRequest) {
    const history = await this.memoryService.getHistory(request.userId, request.groupId);

    // Save user message
    await this.memoryService.appendMessage(
      request.userId,
      { role: 'user', content: request.message },
      request.groupId,
    );

    if (request.stream) {
      return this.chatStream(request, history);
    }

    const response = await this.aiPort.complete({
      systemPrompt: this.systemPrompt,
      userPrompt: this.buildContextualPrompt(request.message, history),
    });

    // Save assistant response
    await this.memoryService.appendMessage(
      request.userId,
      { role: 'assistant', content: response.content },
      request.groupId,
    );

    return { content: response.content, tokensUsed: response.tokensUsed };
  }

  private async chatStream(request: ChatRequest, history: ChatMessage[]) {
    let fullContent = '';

    await this.aiPort.stream({
      systemPrompt: this.systemPrompt,
      userPrompt: this.buildContextualPrompt(request.message, history),
      onChunk: (chunk) => {
        fullContent += chunk;
        this.realtimeService.streamAiChunk(request.userId, chunk);
      },
    });

    this.realtimeService.streamAiDone(request.userId);

    await this.memoryService.appendMessage(
      request.userId,
      { role: 'assistant', content: fullContent },
      request.groupId,
    );

    return { streamed: true };
  }

  private buildContextualPrompt(message: string, history: ChatMessage[]): string {
    if (!history.length) return message;

    const historyText = history
      .slice(-10) // Last 10 turns for context
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    return `Previous conversation:\n${historyText}\n\nUser: ${message}`;
  }
}
