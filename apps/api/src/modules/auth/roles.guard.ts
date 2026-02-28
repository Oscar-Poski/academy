import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ObservabilityService } from '../observability/observability.service';
import type { AuthenticatedRequest } from './auth.types';
import { REQUIRED_ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly observability: ObservabilityService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Array<'user' | 'admin'>>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role;

    if (!role || !requiredRoles.includes(role)) {
      this.observability.increment('auth_forbidden_total');
      this.observability.increment('auth_failures_total');
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Admin access required'
      });
    }

    return true;
  }
}
