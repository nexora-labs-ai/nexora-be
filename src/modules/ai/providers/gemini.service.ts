import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    // We'll use the API key from config, but we can default or throw if not found
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set in environment variables');
    }

    this.model = this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.5-flash';
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

  async generateJsonContent<T = Record<string, string | number | boolean | object>>(
    prompt: string,
    maxRetries = 2,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    let attempt = 0;
    while (attempt <= maxRetries) {
      attempt++;
      try {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 60000);

        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(`Gemini API error: ${response.status} - ${errorText}`);
          throw new Error(`Gemini API failed with status ${response.status}`);
        }

        const data = (await response.json()) as {
          candidates?: {
            content?: { parts?: { text?: string }[] };
            finishReason?: string;
          }[];
        };

        const candidate = data?.candidates?.[0];
        const textResponse = candidate?.content?.parts?.[0]?.text;

        if (!textResponse) {
          throw new Error('Invalid response structure from Gemini API');
        }

        if (candidate?.finishReason === 'MAX_TOKENS') {
          this.logger.warn('Gemini API response was truncated due to MAX_TOKENS limit.');
        }

        let cleanedText = textResponse.trim();
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText
            .replace(/^```(?:json)?\n?/i, '')
            .replace(/\n?```$/i, '')
            .trim();
        }

        return JSON.parse(cleanedText);
      } catch (error) {
        if (attempt <= maxRetries && error instanceof SyntaxError) {
          this.logger.warn(
            `JSON parse error on attempt ${attempt} (${(error as Error).message}). Retrying...`,
          );
          continue;
        }
        this.logger.error(`Error calling Gemini API on attempt ${attempt}`, error);
        throw error;
      }
    }
    throw new Error('Failed to generate valid JSON content after multiple attempts');
  }

  async analyzeImageWithPrompt<T = Record<string, string | number | boolean | object>>(
    imageBuffer: Buffer,
    mimeType: string,
    prompt: string,
    maxRetries = 2,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const base64Data = imageBuffer.toString('base64');
    let attempt = 0;
    while (attempt <= maxRetries) {
      attempt++;
      try {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 60000);

        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1, // low temperature for more deterministic OCR results
              maxOutputTokens: 8192,
            },
          }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(`Gemini Vision API error: ${response.status} - ${errorText}`);
          throw new Error(`Gemini Vision API failed with status ${response.status}`);
        }

        const data = (await response.json()) as {
          candidates?: {
            content?: { parts?: { text?: string }[] };
            finishReason?: string;
          }[];
        };

        const candidate = data?.candidates?.[0];
        const textResponse = candidate?.content?.parts?.[0]?.text;

        if (!textResponse) {
          throw new Error('Invalid response structure from Gemini Vision API');
        }

        if (candidate?.finishReason === 'MAX_TOKENS') {
          this.logger.warn('Gemini Vision API response was truncated due to MAX_TOKENS limit.');
        }

        let cleanedText = textResponse.trim();
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText
            .replace(/^```(?:json)?\n?/i, '')
            .replace(/\n?```$/i, '')
            .trim();
        }

        return JSON.parse(cleanedText);
      } catch (error) {
        if (attempt <= maxRetries && error instanceof SyntaxError) {
          this.logger.warn(
            `JSON parse error on vision attempt ${attempt} (${(error as Error).message}). Retrying...`,
          );
          continue;
        }
        this.logger.error(`Error calling Gemini Vision API on attempt ${attempt}`, error);
        throw error;
      }
    }
    throw new Error('Failed to analyze image after multiple attempts');
  }
}
