import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { RequestLogRecord } from './observability.types';
import { ObservabilityService } from './observability.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(@Inject(ObservabilityService) private readonly observability: ObservabilityService) {}

  use(request: AuthenticatedRequest & { ip?: string; url?: string; method?: string }, response: {
    statusCode?: number;
    setHeader(name: string, value: string): void;
    on(event: 'finish', handler: () => void): void;
  }, next: () => void): void {
    const startedAtMs = Date.now();
    const requestId = this.resolveRequestId(request.headers);
    response.setHeader('x-request-id', requestId);

    response.on('finish', () => {
      const statusCode = response.statusCode ?? 0;
      const durationMs = Date.now() - startedAtMs;
      const userAgent = this.getHeaderValue(request.headers['user-agent']);

      this.observability.increment('requests_total');
      if (statusCode >= 400 && statusCode < 500) {
        this.observability.increment('requests_4xx_total');
      } else if (statusCode >= 500) {
        this.observability.increment('requests_5xx_total');
      }

      const record: RequestLogRecord = {
        ts: new Date().toISOString(),
        level: 'info',
        msg: 'request_completed',
        request_id: requestId,
        method: request.method ?? 'UNKNOWN',
        path: request.url ?? '',
        status_code: statusCode,
        duration_ms: durationMs,
        ip: request.ip ?? null,
        user_agent: userAgent
      };

      if (request.user?.sub) {
        record.user_id = request.user.sub;
      }

      // Structured, line-delimited JSON for downstream log ingestion.
      console.log(JSON.stringify(record));
    });

    next();
  }

  private resolveRequestId(headers: Record<string, string | string[] | undefined>): string {
    const incoming = this.getHeaderValue(headers['x-request-id']);
    if (incoming) {
      return incoming;
    }

    return randomUUID();
  }

  private getHeaderValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
      const first = value[0]?.trim();
      return first ? first : null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    return null;
  }
}
