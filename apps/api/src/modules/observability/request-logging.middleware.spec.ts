import { RequestLoggingMiddleware } from './request-logging.middleware';
import { ObservabilityService } from './observability.service';

type TestResponse = {
  statusCode: number;
  headers: Record<string, string>;
  finishHandlers: Array<() => void>;
  setHeader(name: string, value: string): void;
  on(event: 'finish', handler: () => void): void;
};

describe('RequestLoggingMiddleware', () => {
  const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  afterEach(() => {
    consoleLog.mockClear();
  });

  afterAll(() => {
    consoleLog.mockRestore();
  });

  it('sets x-request-id header and reuses inbound request id', () => {
    const observability = new ObservabilityService();
    const middleware = new RequestLoggingMiddleware(observability);
    const response = createResponse(200);

    middleware.use(
      {
        headers: {
          'x-request-id': 'req-123',
          'user-agent': 'jest-agent'
        },
        method: 'GET',
        url: '/health',
        ip: '127.0.0.1'
      },
      response,
      () => undefined
    );

    response.finishHandlers.forEach((handler) => handler());

    expect(response.headers['x-request-id']).toBe('req-123');
    expect(observability.snapshot().counters.requests_total).toBe(1);
    expect(consoleLog).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(consoleLog.mock.calls[0][0] as string) as {
      request_id: string;
      method: string;
      path: string;
      status_code: number;
      user_agent: string | null;
    };
    expect(payload.request_id).toBe('req-123');
    expect(payload.method).toBe('GET');
    expect(payload.path).toBe('/health');
    expect(payload.status_code).toBe(200);
    expect(payload.user_agent).toBe('jest-agent');
  });

  it('generates request id and increments status bucket metrics', () => {
    const observability = new ObservabilityService();
    const middleware = new RequestLoggingMiddleware(observability);
    const response = createResponse(401);

    middleware.use(
      {
        headers: {},
        method: 'POST',
        url: '/v1/auth/me'
      },
      response,
      () => undefined
    );

    response.finishHandlers.forEach((handler) => handler());

    expect(typeof response.headers['x-request-id']).toBe('string');
    expect(response.headers['x-request-id'].length).toBeGreaterThan(0);

    const counters = observability.snapshot().counters;
    expect(counters.requests_total).toBe(1);
    expect(counters.requests_4xx_total).toBe(1);
    expect(counters.requests_5xx_total).toBe(0);
  });

  function createResponse(statusCode: number): TestResponse {
    return {
      statusCode,
      headers: {},
      finishHandlers: [],
      setHeader(name: string, value: string) {
        this.headers[name] = value;
      },
      on(event: 'finish', handler: () => void) {
        if (event === 'finish') {
          this.finishHandlers.push(handler);
        }
      }
    };
  }
});
