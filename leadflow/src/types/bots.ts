export type BotPresenceFilter = "any" | "with" | "without";

export interface BotConfig {
  id: string;
  slug: string;
  name: string;
  lead_owner_id: string | null;
  owner_email: string;
  search_term: string;
  niche: string;
  initial_message: string;
  cities: string[];
  min_reviews: number;
  min_reviews_enabled: boolean;
  estimated_ticket: number;
  website_filter: BotPresenceFilter;
  phone_filter: BotPresenceFilter;
  headless: boolean;
  max_scrolls: number;
  excluded_words: string[];
  excluded_words_enabled: boolean;
  included_words: string[];
  included_words_enabled: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BotState {
  status?: string;
  atividade_atual?: string;
  cidade_atual?: string;
  ultima_cidade?: string;
  indice_cidade?: number;
  total_cidades?: number;
  empresa_atual?: string;
  item_atual?: number;
  total_itens?: number;
  ultima_cidade_total_empresas?: number;
  ultima_empresa_verificada?: string;
  ultimo_resultado_verificacao?: string;
  ultimo_lead_incluido?: string;
  ultimo_lead_salvo?: string;
  ultimo_lead_importado?: string;
  leads_incluidos?: number;
  leads_importados?: number;
  empresas_verificadas?: number;
  empresas_descartadas?: number;
  empresas_com_falha?: number;
  cidades_concluidas?: string[];
  cidades_com_falha?: string[];
  heartbeat_em?: string;
  checkpoint_salvo_em?: string;
  ultimo_erro?: string;
  executor?: {
    id?: string;
    hostname?: string;
    ambiente?: string;
    pid?: number;
    processo?: string;
  };
}

export interface BotCheckpoint {
  bot_id: string;
  process_name: string;
  state: BotState;
  status: string;
  runner_id: string | null;
  lease_expires_at: string | null;
  version: number;
  updated_at: string;
}

export interface BotControl {
  bot_id: string;
  command: "rodando" | "pausado" | "parado";
  target_runner_id: string | null;
  request_id: string;
  requested_at: string;
  acknowledged_at: string | null;
}

export interface BotRunner {
  id: string;
  name: string;
  environment: string;
  status: string;
  heartbeat_at: string;
}

export interface BotRuntime {
  config: BotConfig;
  control: BotControl | null;
  runner: BotRunner | null;
  checkpoints: {
    scraper?: BotCheckpoint;
    importador?: BotCheckpoint;
  };
}

export interface BotEvent {
  id: number;
  event_id: string;
  bot_id: string;
  process_name: string;
  runner_id: string | null;
  event_type: string;
  level: string;
  message: string;
  data: Record<string, unknown>;
  created_at: string;
}

export type BotFormData = Omit<
  BotConfig,
  "id" | "version" | "created_at" | "updated_at" | "deleted_at"
>;
