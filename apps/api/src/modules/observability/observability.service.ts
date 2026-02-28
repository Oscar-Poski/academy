import { Injectable } from '@nestjs/common';
import { METRIC_KEYS, type MetricKey, type MetricsSnapshot } from './observability.types';

@Injectable()
export class ObservabilityService {
  private readonly startedAt = Date.now();
  private readonly counters = new Map<MetricKey, number>();

  constructor() {
    for (const key of METRIC_KEYS) {
      this.counters.set(key, 0);
    }
  }

  increment(metric: MetricKey, amount = 1): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    this.counters.set(metric, (this.counters.get(metric) ?? 0) + amount);
  }

  snapshot(): MetricsSnapshot {
    const counters = {} as Record<MetricKey, number>;
    for (const key of METRIC_KEYS) {
      counters[key] = this.counters.get(key) ?? 0;
    }

    return {
      uptime_seconds: Math.floor((Date.now() - this.startedAt) / 1000),
      counters,
      generated_at: new Date().toISOString()
    };
  }

  resetForTests(): void {
    for (const key of METRIC_KEYS) {
      this.counters.set(key, 0);
    }
  }
}
