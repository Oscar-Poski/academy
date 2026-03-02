import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { BearerAuthGuard } from './bearer-auth.guard';
import { AdminBearerAuthGuard } from './admin-bearer-auth.guard';
import { OptionalBearerAuthGuard } from './optional-bearer-auth.guard';
import { RolesGuard } from './roles.guard';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    AuthRateLimitService,
    AuthRateLimitGuard,
    BearerAuthGuard,
    OptionalBearerAuthGuard,
    AdminBearerAuthGuard,
    RolesGuard
  ],
  exports: [AuthTokenService, BearerAuthGuard, OptionalBearerAuthGuard, AdminBearerAuthGuard, RolesGuard]
})
export class AuthModule {}
