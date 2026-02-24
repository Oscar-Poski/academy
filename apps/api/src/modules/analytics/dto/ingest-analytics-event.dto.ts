export interface IngestAnalyticsEventDto {
  event_name: string;
  occurred_at: string;
  idempotency_key?: string | null;
  user_id?: string | null;
  path_id?: string | null;
  module_id?: string | null;
  section_id?: string | null;
  section_version_id?: string | null;
  payload_json?: unknown;
}
