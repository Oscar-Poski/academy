import { Inject, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthPrincipal } from './auth.types';

const DEFAULT_EXPIRES_IN_SECONDS = 900;

@Injectable()
export class AuthTokenService {
  constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  getAccessTokenTtlSeconds(): number {
    const raw = process.env.JWT_EXPIRES_IN;
    if (!raw) {
      return DEFAULT_EXPIRES_IN_SECONDS;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_EXPIRES_IN_SECONDS;
    }

    return parsed;
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

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET is required');
    }

    return secret;
  }
}
