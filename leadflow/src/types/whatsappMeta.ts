export const WHATSAPP_META_API_VERSION = "v26.0";
export const WHATSAPP_META_WEBHOOK_URL =
  "https://aourdqlbrrzbqguuoawf.supabase.co/functions/v1/whatsapp-meta-webhook";

export type WhatsAppMetaCredentialStatus = "active" | "invalid" | "revoked";

export interface WhatsAppMetaSession {
  session_id: string;
  session_name: string;
  provider: "meta_cloud_api";
  session_status: string;
  configured: boolean;
  credential_status: WhatsAppMetaCredentialStatus | null;
  waba_id: string | null;
  phone_number_id: string | null;
  display_phone_number: string | null;
  verified_name: string | null;
  quality_rating: string | null;
  code_verification_status: string | null;
  api_version: string;
  last_verified_at: string | null;
  last_error: string | null;
  has_app_secret: boolean;
}

export interface WhatsAppMetaConfigResponse {
  sessions: WhatsAppMetaSession[];
}

export interface WhatsAppMetaCredentialInput {
  session_id?: string;
  session_name: string;
  waba_id: string;
  phone_number_id: string;
  token: string;
  app_secret: string;
  api_version: string;
}

export interface WhatsAppMetaTestResponse {
  ok: true;
  phone: {
    id: string;
    display_phone_number: string | null;
    verified_name: string | null;
    quality_rating: string | null;
    code_verification_status: string | null;
  };
}

export interface WhatsAppMetaSaveResponse {
  ok: true;
  session_id: string;
  status: "active";
  display_phone_number: string | null;
  verified_name: string | null;
  api_version: string;
}
