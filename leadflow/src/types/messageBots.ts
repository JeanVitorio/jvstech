export type MessageBotCommand = "rodando" | "pausado" | "parado";
export type WhatsAppSessionStatus =
  | "disconnected"
  | "connecting"
  | "qr_pending"
  | "ready"
  | "error";

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export interface WeeklySchedule {
  mon: DaySchedule;
  tue: DaySchedule;
  wed: DaySchedule;
  thu: DaySchedule;
  fri: DaySchedule;
  sat: DaySchedule;
  sun: DaySchedule;
}

export interface WhatsAppSession {
  id: string;
  name: string;
  owner_id: string;
  status: WhatsAppSessionStatus;
  runner_id: string | null;
  connected_number: string | null;
  qr_code_data_url: string | null;
  qr_generated_at: string | null;
  last_error: string | null;
  last_seen_at: string | null;
  version: number;
  deleted_at: string | null;
}

export interface MessageBotConfig {
  id: string;
  slug: string;
  name: string;
  created_by: string;
  lead_owner_id: string;
  whatsapp_session_id: string;
  niche: string;
  source_stage_id: string;
  target_stage_id: string;
  message_template: string;
  min_interval_seconds: number;
  max_interval_seconds: number;
  max_messages_per_hour: number;
  weekly_schedule: WeeklySchedule;
  timezone: "America/Sao_Paulo";
  version: number;
  deleted_at: string | null;
}

export interface MessageBotControl {
  bot_id: string;
  command: MessageBotCommand;
  target_runner_id: string | null;
  request_id: string;
  requested_at: string;
  acknowledged_at: string | null;
}

export interface MessageBotRuntimeState {
  bot_id: string;
  runner_id: string | null;
  status: string;
  sent_count: number;
  invalid_count: number;
  failed_count: number;
  current_lead_id: string | null;
  next_send_at: string | null;
  heartbeat_at: string | null;
  last_sent_at: string | null;
  last_error: string | null;
}

export interface MessageBotRuntime {
  config: MessageBotConfig;
  session: WhatsAppSession;
  control: MessageBotControl | null;
  runtime: MessageBotRuntimeState | null;
}

export interface MessageBotFormData {
  slug: string;
  name: string;
  lead_owner_id: string;
  whatsapp_session_id: string;
  new_session_name?: string;
  niche: string;
  source_stage_id: string;
  target_stage_id: string;
  message_template: string;
  min_interval_seconds: number;
  max_interval_seconds: number;
  max_messages_per_hour: number;
  weekly_schedule: WeeklySchedule;
}

export interface LeadStageOption {
  id: string;
  name: string;
  position: number;
}
