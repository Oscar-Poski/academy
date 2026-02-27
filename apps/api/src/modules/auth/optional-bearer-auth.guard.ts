import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AuthTokenService } from './auth-token.service';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class OptionalBearerAuthGuard implements CanActivate {
  constructor(@Inject(AuthTokenService) private readonly authTokenService: AuthTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      return true;
    }

    try {
      request.user = await this.authTokenService.verifyAccessToken(token);
    } catch {
      // Bridge mode: ignore invalid bearer on optional/legacy endpoints.
    }

    return true;
  }

  private extractBearerToken(value: string | string[] | undefined): string | null {
    const rawHeader = Array.isArray(value) ? value[0] : value;
    if (typeof rawHeader !== 'string') {
      return null;
    }

    const match = rawHeader.match(/^Bearer\s+(.+)$/i);
    if (!match || match[1].trim().length === 0) {
      return null;
    }

    return match[1].trim();
  }
}
