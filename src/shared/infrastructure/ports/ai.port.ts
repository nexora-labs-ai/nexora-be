export interface AiCompletionRequest {
  systemPrompt?: string;
  userPrompt: string;
  context?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface AiCompletionResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

export interface AiEmbeddingRequest {
  text: string;
}

export interface AiEmbeddingResponse {
  embedding: number[];
  tokensUsed: number;
}

export interface AiStreamRequest extends AiCompletionRequest {
  onChunk: (chunk: string) => void;
}

export const AI_PORT = Symbol('AI_PORT');

export interface AiPort {
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
  stream(request: AiStreamRequest): Promise<void>;
  embed(request: AiEmbeddingRequest): Promise<AiEmbeddingResponse>;
}
