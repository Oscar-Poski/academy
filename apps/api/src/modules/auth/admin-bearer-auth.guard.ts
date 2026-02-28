import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ObservabilityService } from '../observability/observability.service';
import { AuthTokenService } from './auth-token.service';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class AdminBearerAuthGuard implements CanActivate {
  constructor(
    @Inject(AuthTokenService) private readonly authTokenService: AuthTokenService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ObservabilityService) private readonly observability: ObservabilityService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    try {
      const token = this.extractBearerToken(request.headers.authorization);
      const principal = await this.authTokenService.verifyAccessToken(token);

      const user = await this.prisma.user.findUnique({
        where: { id: principal.sub },
        select: {
          id: true,
          email: true,
          role: true
        }
      });

      if (!user) {
        this.throwForbidden();
      }

      request.user = {
        sub: user.id,
        email: user.email,
        role: user.role
      };

      return true;
    } catch {
      this.throwForbidden();
    }
  }

  private extractBearerToken(value: string | string[] | undefined): string {
    const rawHeader = Array.isArray(value) ? value[0] : value;
    if (typeof rawHeader !== 'string') {
      this.throwForbidden();
    }

    const match = rawHeader.match(/^Bearer\s+(.+)$/i);
    if (!match || match[1].trim().length === 0) {
      this.throwForbidden();
    }

    return match[1].trim();
  }

  private throwForbidden(): never {
    this.observability.increment('auth_forbidden_total');
    this.observability.increment('auth_failures_total');
    throw new ForbiddenException({
      code: 'forbidden',
      message: 'Admin access required'
    });
  }
}
