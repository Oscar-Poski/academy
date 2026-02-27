import { JwtService } from '@nestjs/jwt';
import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalExpires = process.env.JWT_EXPIRES_IN;
  const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;
  const originalRefreshExpires = process.env.JWT_REFRESH_EXPIRES_IN;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_EXPIRES_IN = '120';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-jwt-secret';
    process.env.JWT_REFRESH_EXPIRES_IN = '3600';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
    process.env.JWT_EXPIRES_IN = originalExpires;
    process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
    process.env.JWT_REFRESH_EXPIRES_IN = originalRefreshExpires;
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

  it('signs and verifies refresh token claims', async () => {
    const service = new AuthTokenService(new JwtService());

    const issued = await service.createRefreshToken({
      sub: 'user-1'
    });

    expect(typeof issued.refreshToken).toBe('string');
    expect(issued.expiresIn).toBe(3600);

    const payload = await service.verifyRefreshToken(issued.refreshToken);
    expect(payload.sub).toBe('user-1');
    expect(typeof payload.jti).toBe('string');
    expect(payload.jti.length).toBeGreaterThan(0);
  });

  it('rejects invalid refresh token', async () => {
    const service = new AuthTokenService(new JwtService());

    await expect(service.verifyRefreshToken('bad-refresh-token')).rejects.toMatchObject({
      response: {
        code: 'unauthorized',
        message: 'Invalid refresh token'
      }
    });
  });

  it('rejects expired refresh token', async () => {
    const service = new AuthTokenService(new JwtService());

    const token = await new JwtService().signAsync(
      { sub: 'user-1', jti: 'refresh-token-jti' },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: -1
      }
    );

    await expect(service.verifyRefreshToken(token)).rejects.toMatchObject({
      response: {
        code: 'unauthorized',
        message: 'Invalid refresh token'
      }
    });
  });
});
