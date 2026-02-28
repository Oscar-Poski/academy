export type AnalyticsEventName =
  | 'section_start'
  | 'section_complete'
  | 'player_exit'
  | 'player_dropoff';

export type PostAnalyticsEventRequest = {
  event_name: AnalyticsEventName;
  occurred_at: string;
  idempotency_key?: string | null;
  user_id: string;
  path_id: string;
  module_id: string;
  section_id: string;
  section_version_id: string;
  payload_json?: Record<string, unknown>;
};

export type PostAnalyticsEventResponse = {
  id: string;
};
