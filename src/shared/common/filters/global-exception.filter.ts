import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  LoggerService,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../domain-errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = request.headers['x-correlation-id'] as string;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: unknown;

    if (exception instanceof DomainError) {
      statusCode = exception.statusCode;
      message = exception.message;
      code = exception.code;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object') {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string) ?? message;
        details = obj.details;
        code = (obj.error as string) ?? code;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        'GlobalExceptionFilter',
      );
    }

    // Don't expose stack traces in production
    const isDev = process.env.NODE_ENV !== 'production';

    response.status(statusCode).json({
      success: false,
      statusCode,
      code,
      message,
      ...(details ? { details } : {}),
      ...(isDev && exception instanceof Error ? { stack: exception.stack } : {}),
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
