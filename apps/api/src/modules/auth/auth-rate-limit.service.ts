import { Injectable } from '@nestjs/common';

type AuthRateLimitEndpoint = 'login' | 'register';

type AuthRateLimitBucket = {
  count: number;
  windowStartedAtMs: number;
};

type AuthRateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

@Injectable()
export class AuthRateLimitService {
  private readonly buckets = new Map<string, AuthRateLimitBucket>();
  private readonly windowMs: number;
  private readonly maxByEndpoint: Record<AuthRateLimitEndpoint, number>;

  constructor() {
    this.windowMs = this.parsePositiveInteger(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS, 60) * 1000;
    this.maxByEndpoint = {
      login: this.parsePositiveInteger(process.env.AUTH_RATE_LIMIT_LOGIN_MAX, 10),
      register: this.parsePositiveInteger(process.env.AUTH_RATE_LIMIT_REGISTER_MAX, 5)
    };
  }

  consume(endpoint: AuthRateLimitEndpoint, ip: string | undefined, nowMs = Date.now()): AuthRateLimitDecision {
    const key = `${endpoint}:${this.normalizeIp(ip)}`;
    const max = this.maxByEndpoint[endpoint];
    const existing = this.buckets.get(key);

    if (!existing || nowMs - existing.windowStartedAtMs >= this.windowMs) {
      this.buckets.set(key, { count: 1, windowStartedAtMs: nowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existing.count >= max) {
      const retryAfterMs = Math.max(0, existing.windowStartedAtMs + this.windowMs - nowMs);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000))
      };
    }

    existing.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  resetForTests(): void {
    this.buckets.clear();
  }

  private normalizeIp(value: string | undefined): string {
    if (!value || value.trim().length === 0) {
      return 'unknown';
    }

    return value.trim();
  }

  private parsePositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value?.trim());
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }
}
