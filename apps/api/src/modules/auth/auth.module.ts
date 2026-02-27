import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { BearerAuthGuard } from './bearer-auth.guard';
import { AdminBearerAuthGuard } from './admin-bearer-auth.guard';
import { OptionalBearerAuthGuard } from './optional-bearer-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    BearerAuthGuard,
    OptionalBearerAuthGuard,
    AdminBearerAuthGuard,
    RolesGuard
  ],
  exports: [AuthTokenService, OptionalBearerAuthGuard, AdminBearerAuthGuard, RolesGuard]
})
export class AuthModule {}
