import { AuthService } from './auth.service';
import { hash } from 'bcryptjs';
import type { AuthTokenService } from './auth-token.service';

describe('AuthService', () => {
  it('authenticates valid password and returns token payload', async () => {
    const passwordHash = await hash('password123', 10);

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          email: 'user@example.com',
          role: 'user',
          passwordHash
        })
      }
    };

    const authTokenService = {
      createAccessToken: jest.fn().mockResolvedValue({
        accessToken: 'token-123',
        expiresIn: 900
      })
    } as unknown as AuthTokenService;

    const service = new AuthService(prisma as never, authTokenService);

    const result = await service.login({
      email: ' USER@EXAMPLE.COM ',
      password: 'password123'
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true
      }
    });
    expect(authTokenService.createAccessToken).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'user@example.com',
      role: 'user'
    });
    expect(result).toEqual({
      access_token: 'token-123',
      token_type: 'Bearer',
      expires_in: 900
    });
  });

  it('rejects wrong password', async () => {
    const passwordHash = await hash('password123', 10);

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          email: 'user@example.com',
          role: 'user',
          passwordHash
        })
      }
    };

    const authTokenService = {
      createAccessToken: jest.fn()
    } as unknown as AuthTokenService;

    const service = new AuthService(prisma as never, authTokenService);

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'wrong-password'
      })
    ).rejects.toMatchObject({
      response: {
        code: 'invalid_credentials',
        message: 'Invalid email or password'
      }
    });
  });

  it('rejects user with null password hash', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          email: 'user@example.com',
          role: 'user',
          passwordHash: null
        })
      }
    };

    const authTokenService = {
      createAccessToken: jest.fn()
    } as unknown as AuthTokenService;

    const service = new AuthService(prisma as never, authTokenService);

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'password123'
      })
    ).rejects.toMatchObject({
      response: {
        code: 'invalid_credentials',
        message: 'Invalid email or password'
      }
    });
  });
});
