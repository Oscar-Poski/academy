import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  const originalEnv = {
    window: process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    login: process.env.AUTH_RATE_LIMIT_LOGIN_MAX,
    register: process.env.AUTH_RATE_LIMIT_REGISTER_MAX
  };

  beforeEach(() => {
    process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS = '60';
    process.env.AUTH_RATE_LIMIT_LOGIN_MAX = '10';
    process.env.AUTH_RATE_LIMIT_REGISTER_MAX = '5';
  });

  afterAll(() => {
    process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS = originalEnv.window;
    process.env.AUTH_RATE_LIMIT_LOGIN_MAX = originalEnv.login;
    process.env.AUTH_RATE_LIMIT_REGISTER_MAX = originalEnv.register;
  });

  it('allows requests under threshold', () => {
    const limiter = new AuthRateLimitService();

    for (let i = 0; i < 10; i += 1) {
      const decision = limiter.consume('login', '127.0.0.1');
      expect(decision).toEqual({ allowed: true, retryAfterSeconds: 0 });
    }
  });

  it('blocks at threshold + 1 with positive retry_after_seconds', () => {
    const limiter = new AuthRateLimitService();

    for (let i = 0; i < 10; i += 1) {
      limiter.consume('login', '127.0.0.1', 1_000);
    }

    const blocked = limiter.consume('login', '127.0.0.1', 1_500);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets after window expires', () => {
    const limiter = new AuthRateLimitService();

    for (let i = 0; i < 10; i += 1) {
      limiter.consume('login', '127.0.0.1', 1_000);
    }

    expect(limiter.consume('login', '127.0.0.1', 1_001).allowed).toBe(false);
    expect(limiter.consume('login', '127.0.0.1', 61_001)).toEqual({
      allowed: true,
      retryAfterSeconds: 0
    });
  });

  it('isolates counters by endpoint', () => {
    const limiter = new AuthRateLimitService();

    for (let i = 0; i < 10; i += 1) {
      limiter.consume('login', '127.0.0.1', 1_000);
    }
    for (let i = 0; i < 5; i += 1) {
      limiter.consume('register', '127.0.0.1', 1_000);
    }

    expect(limiter.consume('login', '127.0.0.1', 1_001).allowed).toBe(false);
    expect(limiter.consume('register', '127.0.0.1', 1_001).allowed).toBe(false);
  });

  it('resetForTests clears all counters', () => {
    const limiter = new AuthRateLimitService();

    for (let i = 0; i < 10; i += 1) {
      limiter.consume('login', '127.0.0.1', 1_000);
    }
    expect(limiter.consume('login', '127.0.0.1', 1_001).allowed).toBe(false);

    limiter.resetForTests();
    expect(limiter.consume('login', '127.0.0.1', 1_001)).toEqual({
      allowed: true,
      retryAfterSeconds: 0
    });
  });
});
