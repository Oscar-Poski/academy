import { JwtService } from '@nestjs/jwt';
import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalExpires = process.env.JWT_EXPIRES_IN;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_EXPIRES_IN = '120';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
    process.env.JWT_EXPIRES_IN = originalExpires;
  });

  it('signs and verifies token claims', async () => {
    const service = new AuthTokenService(new JwtService());

    const issued = await service.createAccessToken({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'user'
    });

    expect(typeof issued.accessToken).toBe('string');
    expect(issued.expiresIn).toBe(120);

    const payload = await service.verifyAccessToken(issued.accessToken);
    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('user@example.com');
    expect(payload.role).toBe('user');
  });

  it('rejects invalid token', async () => {
    const service = new AuthTokenService(new JwtService());

    await expect(service.verifyAccessToken('bad-token')).rejects.toMatchObject({
      response: {
        code: 'unauthorized',
        message: 'Invalid or missing bearer token'
      }
    });
  });

  it('rejects expired token', async () => {
    const service = new AuthTokenService(new JwtService());

    const token = await new JwtService().signAsync(
      { sub: 'user-1', email: 'user@example.com', role: 'user' },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: -1
      }
    );

    await expect(service.verifyAccessToken(token)).rejects.toMatchObject({
      response: {
        code: 'unauthorized',
        message: 'Invalid or missing bearer token'
      }
    });
  });
});
