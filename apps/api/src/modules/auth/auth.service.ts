import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { compare } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ObservabilityService } from '../observability/observability.service';
import type { RefreshPrincipal } from './auth.types';
import type {
  AuthMeDto,
  LoginRequestDto,
  LoginResponseDto,
  LogoutRequestDto,
  LogoutResponseDto,
  RefreshRequestDto
} from './dto';
import { AuthTokenService } from './auth-token.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthTokenService) private readonly authTokenService: AuthTokenService,
    @Inject(ObservabilityService) private readonly observability: ObservabilityService
  ) {}

  async login(input: LoginRequestDto): Promise<LoginResponseDto> {
    const email = this.normalizeRequiredString(input?.email, 'email');
    const password = this.normalizeRequiredString(input?.password, 'password');

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true
      }
    });

    if (!user?.passwordHash) {
      this.throwInvalidCredentials();
    }

    const passwordMatches = await compare(password, user.passwordHash);
    if (!passwordMatches) {
      this.throwInvalidCredentials();
    }

    return this.issueTokenPair({
      id: user.id,
      email: user.email,
      role: user.role
    });
  }

  async refresh(input: RefreshRequestDto): Promise<LoginResponseDto> {
    const rawRefreshToken = this.normalizeRequiredString(input?.refresh_token, 'refresh_token');
    let refreshPrincipal: RefreshPrincipal;
    try {
      refreshPrincipal = await this.authTokenService.verifyRefreshToken(rawRefreshToken);
    } catch {
      this.throwInvalidRefreshToken();
    }
    const tokenHash = this.hashToken(rawRefreshToken);
    const now = new Date();

    const existingToken = await this.prisma.authRefreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true
      }
    });

    if (
      !existingToken ||
      existingToken.userId !== refreshPrincipal.sub ||
      existingToken.revokedAt !== null ||
      existingToken.expiresAt <= now
    ) {
      this.throwInvalidRefreshToken();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: refreshPrincipal.sub },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
      this.throwInvalidRefreshToken();
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.authRefreshToken.update({
        where: { id: existingToken.id },
        data: { revokedAt: now }
      });

      return this.issueTokenPair(
        {
          id: user.id,
          email: user.email,
          role: user.role
        },
        tx
      );
    });
  }

  async logout(input: LogoutRequestDto): Promise<LogoutResponseDto> {
    const rawRefreshToken = this.normalizeRequiredString(input?.refresh_token, 'refresh_token');
    let refreshPrincipal: RefreshPrincipal;
    try {
      refreshPrincipal = await this.authTokenService.verifyRefreshToken(rawRefreshToken);
    } catch {
      this.throwInvalidRefreshToken();
    }
    const tokenHash = this.hashToken(rawRefreshToken);
    const now = new Date();

    const existingToken = await this.prisma.authRefreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true
      }
    });

    if (
      !existingToken ||
      existingToken.userId !== refreshPrincipal.sub ||
      existingToken.revokedAt !== null ||
      existingToken.expiresAt <= now
    ) {
      this.throwInvalidRefreshToken();
    }

    await this.prisma.authRefreshToken.update({
      where: { id: existingToken.id },
      data: { revokedAt: now }
    });

    return { success: true };
  }

  async getMe(userId: string): Promise<AuthMeDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid or missing bearer token'
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  }

  private normalizeRequiredString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      if (field === 'refresh_token') {
        this.throwInvalidRefreshToken();
      }
      this.throwInvalidCredentials();
    }

    const normalized = value.trim();
    return field === 'email' ? normalized.toLowerCase() : normalized;
  }

  private async issueTokenPair(
    user: { id: string; email: string; role: 'user' | 'admin' },
    tx?: Prisma.TransactionClient
  ): Promise<LoginResponseDto> {
    const [accessIssued, refreshIssued] = await Promise.all([
      this.authTokenService.createAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role
      }),
      this.authTokenService.createRefreshToken({
        sub: user.id
      })
    ]);

    const refreshExpiresAt = new Date(Date.now() + refreshIssued.expiresIn * 1000);
    const refreshTokenHash = this.hashToken(refreshIssued.refreshToken);
    const db = tx ?? this.prisma;

    await db.authRefreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshExpiresAt
      }
    });

    return {
      access_token: accessIssued.accessToken,
      token_type: 'Bearer',
      expires_in: accessIssued.expiresIn,
      refresh_token: refreshIssued.refreshToken,
      refresh_expires_in: refreshIssued.expiresIn
    };
  }

  private throwInvalidCredentials(): never {
    this.observability.increment('auth_invalid_credentials_total');
    this.observability.increment('auth_failures_total');
    throw new UnauthorizedException({
      code: 'invalid_credentials',
      message: 'Invalid email or password'
    });
  }

  private throwInvalidRefreshToken(): never {
    this.observability.increment('auth_invalid_refresh_token_total');
    this.observability.increment('auth_failures_total');
    throw new UnauthorizedException({
      code: 'unauthorized',
      message: 'Invalid refresh token'
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
