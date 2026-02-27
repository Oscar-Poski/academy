import { JwtService } from '@nestjs/jwt';

const jwt = new JwtService();

export function bearerToken(userId: string, role: 'user' | 'admin' = 'user'): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required for bearer token test helper');
  }

  const token = jwt.sign(
    {
      sub: userId,
      email: `${userId}@academy.local`,
      role
    },
    {
      secret,
      expiresIn: 3600
    }
  );

  return `Bearer ${token}`;
}
