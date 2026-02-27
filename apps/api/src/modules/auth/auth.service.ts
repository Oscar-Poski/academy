import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthMeDto, LoginRequestDto, LoginResponseDto } from './dto';
import { AuthTokenService } from './auth-token.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthTokenService) private readonly authTokenService: AuthTokenService
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

    const issued = await this.authTokenService.createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    return {
      access_token: issued.accessToken,
      token_type: 'Bearer',
      expires_in: issued.expiresIn
    };
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
      this.throwInvalidCredentials();
    }

    const normalized = value.trim();
    return field === 'email' ? normalized.toLowerCase() : normalized;
  }

  private throwInvalidCredentials(): never {
    throw new UnauthorizedException({
      code: 'invalid_credentials',
      message: 'Invalid email or password'
    });
  }
}
