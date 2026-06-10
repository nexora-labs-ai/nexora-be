import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

export function ApiEndpoint(options: {
  summary: string;
  description?: string;
  statusCode?: number;
  isPublic?: boolean;
}) {
  const decorators = [
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiResponse({ status: options.statusCode ?? 200 }),
    ApiResponse({ status: 400, description: 'Bad Request' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
  ];

  if (!options.isPublic) {
    decorators.push(ApiBearerAuth());
  }

  return applyDecorators(...decorators);
}
