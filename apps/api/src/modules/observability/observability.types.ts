export const METRIC_KEYS = [
  'auth_failures_total',
  'auth_invalid_credentials_total',
  'auth_invalid_bearer_total',
  'auth_invalid_refresh_token_total',
  'auth_forbidden_total',
  'completion_blocked_total',
  'unlock_blocked_total',
  'unlock_insufficient_credits_total',
  'admin_publish_conflict_total',
  'requests_total',
  'requests_4xx_total',
  'requests_5xx_total'
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export type MetricsSnapshot = {
  uptime_seconds: number;
  counters: Record<MetricKey, number>;
  generated_at: string;
};

export type RequestLogRecord = {
  ts: string;
  level: 'info';
  msg: 'request_completed';
  request_id: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  ip: string | null;
  user_agent: string | null;
  user_id?: string;
};
