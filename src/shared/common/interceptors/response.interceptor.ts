import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId = request.headers['x-correlation-id'] as string;

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        correlationId,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
