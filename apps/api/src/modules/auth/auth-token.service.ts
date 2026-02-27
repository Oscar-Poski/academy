import { Inject, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { AuthPrincipal, RefreshPrincipal } from './auth.types';

const DEFAULT_EXPIRES_IN_SECONDS = 900;
const DEFAULT_REFRESH_EXPIRES_IN_SECONDS = 604800;

@Injectable()
export class AuthTokenService {
  constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  getAccessTokenTtlSeconds(): number {
    return this.getPositiveIntegerEnv('JWT_EXPIRES_IN', DEFAULT_EXPIRES_IN_SECONDS);
  }

  getRefreshTokenTtlSeconds(): number {
    return this.getPositiveIntegerEnv('JWT_REFRESH_EXPIRES_IN', DEFAULT_REFRESH_EXPIRES_IN_SECONDS);
  }

  async createAccessToken(principal: AuthPrincipal): Promise<{ accessToken: string; expiresIn: number }> {
    const secret = this.getJwtSecret();
    const expiresIn = this.getAccessTokenTtlSeconds();

    const accessToken = await this.jwtService.signAsync(principal, {
      secret,
      expiresIn
    });

    return { accessToken, expiresIn };
  }

  async verifyAccessToken(token: string): Promise<AuthPrincipal> {
    const secret = this.getJwtSecret();

    try {
      return await this.jwtService.verifyAsync<AuthPrincipal>(token, { secret });
    } catch {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid or missing bearer token'
      });
    }
  }

  async createRefreshToken(principal: { sub: string }): Promise<{ refreshToken: string; expiresIn: number }> {
    const secret = this.getRefreshJwtSecret();
    const expiresIn = this.getRefreshTokenTtlSeconds();

    const refreshToken = await this.jwtService.signAsync(
      { sub: principal.sub, jti: randomUUID() },
      { secret, expiresIn }
    );

    return { refreshToken, expiresIn };
  }

  async verifyRefreshToken(token: string): Promise<RefreshPrincipal> {
    const secret = this.getRefreshJwtSecret();

    try {
      const payload = await this.jwtService.verifyAsync<RefreshPrincipal>(token, { secret });
      if (typeof payload.sub !== 'string' || typeof payload.jti !== 'string') {
        this.throwInvalidRefreshToken();
      }

      return payload;
    } catch {
      this.throwInvalidRefreshToken();
    }
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET is required');
    }

    return secret;
  }

  private getRefreshJwtSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET?.trim();
    if (!secret) {
      throw new InternalServerErrorException('JWT_REFRESH_SECRET is required');
    }

    return secret;
  }

  private getPositiveIntegerEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) {
      return fallback;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private throwInvalidRefreshToken(): never {
    throw new UnauthorizedException({
      code: 'unauthorized',
      message: 'Invalid refresh token'
    });
  }
}
