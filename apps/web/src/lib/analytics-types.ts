export type AnalyticsEventName =
  | 'section_start'
  | 'section_complete'
  | 'player_exit'
  | 'player_dropoff';

export type PostAnalyticsEventRequest = {
  event_name: AnalyticsEventName;
  occurred_at: string;
  idempotency_key?: string | null;
  user_id?: string | null;
  path_id?: string | null;
  module_id?: string | null;
  section_id?: string | null;
  section_version_id?: string | null;
  payload_json?: Record<string, unknown>;
};

export type PostAnalyticsEventResponse = {
  id: string;
};
