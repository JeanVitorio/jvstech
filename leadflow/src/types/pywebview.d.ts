interface NativeSessionPayload {
  supabase_url: string;
  publishable_key: string;
  access_token: string;
  refresh_token: string;
}

interface NativeUpdateResponse {
  status: "updated" | "installing" | "error";
  version: string;
  message: string;
}

interface Window {
  pywebview?: {
    api?: {
      configurar_sessao?: (
        payload: NativeSessionPayload,
      ) => Promise<{ status: string; message: string }>;
      buscar_e_instalar_atualizacao?: () =>
        Promise<NativeUpdateResponse>;
    };
  };
}
