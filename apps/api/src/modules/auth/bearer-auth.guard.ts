import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ObservabilityService } from '../observability/observability.service';
import { AuthTokenService } from './auth-token.service';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(
    @Inject(AuthTokenService) private readonly authTokenService: AuthTokenService,
    @Inject(ObservabilityService) private readonly observability: ObservabilityService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    let principal;
    try {
      principal = await this.authTokenService.verifyAccessToken(token);
    } catch {
      this.observability.increment('auth_invalid_bearer_total');
      this.observability.increment('auth_failures_total');
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid or missing bearer token'
      });
    }
    request.user = principal;
    return true;
  }

  private extractBearerToken(value: string | string[] | undefined): string {
    const rawHeader = Array.isArray(value) ? value[0] : value;
    if (typeof rawHeader !== 'string') {
      this.observability.increment('auth_invalid_bearer_total');
      this.observability.increment('auth_failures_total');
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid or missing bearer token'
      });
    }

    const match = rawHeader.match(/^Bearer\s+(.+)$/i);
    if (!match || match[1].trim().length === 0) {
      this.observability.increment('auth_invalid_bearer_total');
      this.observability.increment('auth_failures_total');
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid or missing bearer token'
      });
    }

    return match[1].trim();
  }
}
