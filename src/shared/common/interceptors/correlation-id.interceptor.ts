import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId = (request.headers['x-correlation-id'] as string) ?? uuidv4();

    request.headers['x-correlation-id'] = correlationId;
    response.setHeader('X-Correlation-ID', correlationId);

    return next.handle();
  }
}
