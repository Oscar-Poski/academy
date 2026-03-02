import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AuthRateLimitService } from './auth-rate-limit.service';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimit: AuthRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      ip?: string;
      path?: string;
      originalUrl?: string;
    }>();

    const endpoint = this.resolveEndpoint(request.path ?? request.originalUrl ?? '');
    const decision = this.rateLimit.consume(endpoint, request.ip);
    if (decision.allowed) {
      return true;
    }

    throw new HttpException(
      {
        code: 'rate_limited',
        message: 'Too many auth attempts. Try again later.',
        retry_after_seconds: decision.retryAfterSeconds
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  private resolveEndpoint(path: string): 'login' | 'register' {
    return path.toLowerCase().endsWith('/register') ? 'register' : 'login';
  }
}
