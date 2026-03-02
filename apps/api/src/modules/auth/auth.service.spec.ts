import { hash } from 'bcryptjs';
import { AuthService } from './auth.service';
import type { AuthTokenService } from './auth-token.service';

describe('AuthService', () => {
  const observability = {
    increment: jest.fn()
  };

  beforeEach(() => {
    observability.increment.mockReset();
  });

  it('authenticates valid password, persists refresh token, and returns token payload', async () => {
    const passwordHash = await hash('password123', 10);

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          email: 'user@example.com',
          role: 'user',
          passwordHash
        })
      },
      authRefreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt1' })
      }
    };

    const authTokenService = {
      createAccessToken: jest.fn().mockResolvedValue({
        accessToken: 'access-123',
        expiresIn: 900
      }),
      createRefreshToken: jest.fn().mockResolvedValue({
        refreshToken: 'refresh-123',
        expiresIn: 604800
      })
    } as unknown as AuthTokenService;

    const service = new AuthService(prisma as never, authTokenService, observability as never);

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
    expect(prisma.authRefreshToken.create).toHaveBeenCalledTimes(1);
    expect(authTokenService.createAccessToken).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'user@example.com',
      role: 'user'
    });
    expect(authTokenService.createRefreshToken).toHaveBeenCalledWith({
      sub: 'u1'
    });
    expect(result).toEqual({
      access_token: 'access-123',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: 'refresh-123',
      refresh_expires_in: 604800
    });
  });

  it('registers user with normalized email and user role, persists hashed password, and returns token payload', async () => {
    const prisma = {
      user: {
        create: jest.fn().mockResolvedValue({
          id: 'u2',
          email: 'new-user@example.com',
          role: 'user'
        })
      },
      authRefreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt2' })
      }
    };

    const authTokenService = {
      createAccessToken: jest.fn().mockResolvedValue({
        accessToken: 'access-register',
        expiresIn: 900
      }),
      createRefreshToken: jest.fn().mockResolvedValue({
        refreshToken: 'refresh-register',
        expiresIn: 604800
      })
    } as unknown as AuthTokenService;

    const service = new AuthService(prisma as never, authTokenService, observability as never);

    const result = await service.register({
      email: ' NEW-USER@EXAMPLE.COM ',
      password: 'password123',
      name: '  New User  '
    });

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    const userCreateArg = prisma.user.create.mock.calls[0]?.[0];
    expect(userCreateArg.data.email).toBe('new-user@example.com');
    expect(userCreateArg.data.name).toBe('New User');
    expect(userCreateArg.data.role).toBe('user');
    expect(userCreateArg.data.passwordHash).toEqual(expect.any(String));
    expect(userCreateArg.data.passwordHash).not.toBe('password123');

    expect(prisma.authRefreshToken.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      access_token: 'access-register',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: 'refresh-register',
      refresh_expires_in: 604800
    });
  });

  it('rejects register when email already exists', async () => {
    const prisma = {
      user: {
        create: jest.fn().mockRejectedValue({ code: 'P2002' })
      },
      authRefreshToken: {
        create: jest.fn()
      }
    };

    const authTokenService = {
      createAccessToken: jest.fn(),
      createRefreshToken: jest.fn()
    } as unknown as AuthTokenService;

    const service = new AuthService(prisma as never, authTokenService, observability as never);

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'password123',
        name: 'User'
      })
    ).rejects.toMatchObject({
      response: {
        code: 'email_in_use',
        message: 'Email already registered'
      }
    });
  });

  it('rejects register for missing required fields', async () => {
    const prisma = {
      user: {
        create: jest.fn()
      },
      authRefreshToken: {
        create: jest.fn()
      }
    };

    const authTokenService = {
      createAccessToken: jest.fn(),
      createRefreshToken: jest.fn()
    } as unknown as AuthTokenService;

    const service = new AuthService(prisma as never, authTokenService, observability as never);

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'password123',
        name: '   '
      })
    ).rejects.toMatchObject({
      response: {
        code: 'invalid_registration_input',
        message: 'Email, password, and name are required'
      }
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects register when password is shorter than 8 chars', async () => {
    const prisma = {
      user: {
        create: jest.fn()
      },
      authRefreshToken: {
        create: jest.fn()
      }
    };

    const authTokenService = {
      createAccessToken: jest.fn(),
      createRefreshToken: jest.fn()
    } as unknown as AuthTokenService;

    const service = new AuthService(prisma as never, authTokenService, observability as never);

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'short7',
        name: 'User'
      })
    ).rejects.toMatchObject({
      response: {
        code: 'weak_password',
        message: 'Password must be at least 8 characters long'
      }
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
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
      },
      authRefreshToken: {
        create: jest.fn()
      }
    };

    const authTokenService = {
      createAccessToken: jest.fn(),
      createRefreshToken: jest.fn()
    } as unknown as AuthTokenService;

    const service = new AuthService(prisma as never, authTokenService, observability as never);

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
      },
      authRefreshToken: {
        create: jest.fn()
      }
    };

    const authTokenService = {
      createAccessToken: jest.fn(),
      createRefreshToken: jest.fn()
    } as unknown as AuthTokenService;

    const service = new AuthService(prisma as never, authTokenService, observability as never);

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

  it('rotates refresh token and rejects replay', async () => {
    const prisma = {
      authRefreshToken: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'rt1',
            userId: 'u1',
            expiresAt: new Date(Date.now() + 60_000),
            revokedAt: null
          })
          .mockResolvedValueOnce({
            id: 'rt1',
            userId: 'u1',
            expiresAt: new Date(Date.now() + 60_000),
            revokedAt: new Date()
          }),
        update: jest.fn().mockResolvedValue({ id: 'rt1' }),
        create: jest.fn().mockResolvedValue({ id: 'rt2' })
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          email: 'user@example.com',
          role: 'user'
        })
      },
      $transaction: jest.fn().mockImplementation(async (callback) => callback(prisma))
    };

    const authTokenService = {
      verifyRefreshToken: jest.fn().mockResolvedValue({ sub: 'u1', jti: 'jti-1' }),
      createAccessToken: jest.fn().mockResolvedValue({ accessToken: 'new-access', expiresIn: 900 }),
      createRefreshToken: jest.fn().mockResolvedValue({ refreshToken: 'new-refresh', expiresIn: 604800 })
    } as unknown as AuthTokenService;

    const service = new AuthService(prisma as never, authTokenService, observability as never);

    const refreshed = await service.refresh({ refresh_token: 'old-refresh-token' });
    expect(refreshed.refresh_token).toBe('new-refresh');

    await expect(service.refresh({ refresh_token: 'old-refresh-token' })).rejects.toMatchObject({
      response: {
        code: 'unauthorized',
        message: 'Invalid refresh token'
      }
    });
  });

  it('revokes refresh token on logout', async () => {
    const prisma = {
      authRefreshToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'rt1',
          userId: 'u1',
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: null
        }),
        update: jest.fn().mockResolvedValue({ id: 'rt1' })
      }
    };

    const authTokenService = {
      verifyRefreshToken: jest.fn().mockResolvedValue({ sub: 'u1', jti: 'jti-1' })
    } as unknown as AuthTokenService;

    const service = new AuthService(prisma as never, authTokenService, observability as never);

    await expect(service.logout({ refresh_token: 'refresh-token' })).resolves.toEqual({ success: true });
    expect(prisma.authRefreshToken.update).toHaveBeenCalledTimes(1);
  });
});
