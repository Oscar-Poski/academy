import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthTokenService } from './auth-token.service';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(@Inject(AuthTokenService) private readonly authTokenService: AuthTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    const principal = await this.authTokenService.verifyAccessToken(token);
    request.user = principal;
    return true;
  }

  private extractBearerToken(value: string | string[] | undefined): string {
    const rawHeader = Array.isArray(value) ? value[0] : value;
    if (typeof rawHeader !== 'string') {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid or missing bearer token'
      });
    }

    const match = rawHeader.match(/^Bearer\s+(.+)$/i);
    if (!match || match[1].trim().length === 0) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid or missing bearer token'
      });
    }

    return match[1].trim();
  }
}
