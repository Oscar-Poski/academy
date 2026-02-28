import { ObservabilityService } from './observability.service';

describe('ObservabilityService', () => {
  it('increments counters and returns snapshot shape', () => {
    const service = new ObservabilityService();

    service.increment('auth_failures_total');
    service.increment('auth_invalid_credentials_total', 2);

    const snapshot = service.snapshot();
    expect(typeof snapshot.uptime_seconds).toBe('number');
    expect(typeof snapshot.generated_at).toBe('string');
    expect(snapshot.counters.auth_failures_total).toBe(1);
    expect(snapshot.counters.auth_invalid_credentials_total).toBe(2);
  });

  it('resetForTests clears counters', () => {
    const service = new ObservabilityService();
    service.increment('requests_total', 5);
    service.increment('unlock_blocked_total', 3);

    service.resetForTests();
    const snapshot = service.snapshot();
    expect(snapshot.counters.requests_total).toBe(0);
    expect(snapshot.counters.unlock_blocked_total).toBe(0);
  });
});
