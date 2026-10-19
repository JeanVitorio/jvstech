-- =============================================================================
-- JVS Tech / LeadFlow - provisionamento completo de um projeto Supabase novo
-- =============================================================================
-- COMO USAR:
-- 1. Altere SOMENTE os valores do bloco CONFIGURACAO abaixo.
-- 2. Cole o arquivo inteiro no SQL Editor de um projeto Supabase vazio.
-- 3. Execute uma única vez e confira o bloco de validação ao final.
--
-- IMPORTANTE: a senha fica visível no histórico do SQL Editor. Depois do
-- primeiro acesso, troque-a em Authentication > Users.
-- =============================================================================

-- =============================================================================
-- CONFIGURACAO - ALTERE ESTES VALORES ANTES DE EXECUTAR
-- =============================================================================
create temporary table _leadflow_config (
  leader_name text not null,
  leader_email text not null,
  leader_password text not null,
  leader_position text,
  leader_phone text
) on commit preserve rows;

insert into _leadflow_config (
  leader_name,
  leader_email,
  leader_password,
  leader_position,
  leader_phone
) values (
  'Nome do Leader',
  'leader@cliente.com.br',
  'Troque-Esta-Senha-Forte-2026!',
  'Diretor(a)',
  null
);

-- =============================================================================
-- EXTENSOES E TIPOS
-- =============================================================================
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum (
    'leader', 'manager', 'collaborator', 'commercial'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_status as enum (
    'todo', 'in_progress', 'review', 'done'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_priority as enum (
    'low', 'medium', 'high', 'urgent'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.client_status as enum (
    'active', 'paused', 'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.team_member_role as enum ('manager', 'member');
exception when duplicate_object then null;
end $$;

-- =============================================================================
-- TABELAS PRINCIPAIS
-- =============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  phone text,
  bio text,
  position text,
  birth_date date,
  skills text[] not null default '{}',
  hourly_rate numeric(12,2),
  contract_start date,
  contract_end date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  salary numeric(12,2),
  tax_rate numeric(8,2),
  hire_date date,
  city text
);

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  constraint user_roles_user_unique unique (user_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text default '#6366f1',
  leader_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_in_team public.team_member_role not null default 'member',
  created_at timestamptz not null default now(),
  constraint team_members_team_user_unique unique (team_id, user_id)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  status public.client_status not null default 'active',
  created_at timestamptz not null default now(),
  phone text,
  contract_start date,
  contract_end date,
  monthly_value numeric(12,2),
  satisfaction integer check (satisfaction between 1 and 5),
  notes text,
  segment text,
  monthly_hours_target integer not null default 40,
  contract_months integer,
  health text not null default 'good'
    check (health in ('great', 'good', 'warning', 'risk')),
  services text[] not null default '{}',
  logo_url text
);

create table if not exists public.kanban_columns (
  id text primary key,
  title text not null,
  accent text not null default 'bg-muted-foreground',
  "order" integer not null default 0,
  base public.task_status,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_price numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6366f1',
  position integer not null default 0,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now(),
  constraint lead_stages_won_or_lost check (not (is_won and is_lost))
);

create unique index if not exists lead_stages_name_unique_idx
  on public.lead_stages (lower(name));

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  client_id uuid references public.clients(id) on delete set null,
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date timestamptz,
  total_seconds integer not null default 0 check (total_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  team_id uuid references public.teams(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  recurrence jsonb,
  parent_task_id uuid references public.tasks(id) on delete set null,
  column_id text references public.kanban_columns(id) on delete set null,
  is_template boolean not null default false,
  template_id uuid references public.tasks(id) on delete set null,
  last_spawn timestamptz
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  seconds integer not null default 0 check (seconds >= 0),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.client_teams (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  constraint client_teams_client_team_unique unique (client_id, team_id)
);

create table if not exists public.team_clients (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint team_clients_team_client_unique unique (team_id, client_id)
);

create table if not exists public.client_satisfaction_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.client_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  monthly_price numeric(12,2),
  started_at date default current_date,
  created_at timestamptz not null default now(),
  constraint client_services_client_service_unique
    unique (client_id, service_id)
);

create table if not exists public.client_collaborators (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'manual'
    check (source in ('manual', 'team', 'auto')),
  team_id uuid references public.teams(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists client_collaborators_manual_unique_idx
  on public.client_collaborators (client_id, user_id)
  where team_id is null;

create unique index if not exists client_collaborators_team_unique_idx
  on public.client_collaborators (client_id, user_id, team_id)
  where team_id is not null;

-- =============================================================================
-- FINANCEIRO E ESTUDIO
-- =============================================================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  occurred_on date not null default current_date,
  description text,
  client_id uuid references public.clients(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  title text,
  recurring boolean not null default false
);

create table if not exists public.cash_adjustments (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount >= 0),
  kind text not null check (kind in ('in', 'out')),
  occurred_on date not null default current_date,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.extra_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  description text,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  occurred_on date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now()
);

create table if not exists public.studio_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_name text,
  client_id uuid references public.clients(id) on delete set null,
  session_date date not null default current_date,
  start_time time,
  hours numeric(10,2) not null default 1 check (hours >= 0),
  hourly_rate numeric(12,2) not null default 0 check (hourly_rate >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'canceled')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'general',
  amount numeric(12,2) not null default 0 check (amount >= 0),
  occurred_on date not null default current_date,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Estruturas legadas existentes no banco exportado. O tipo de ensaio foi
-- preservado como texto porque o dump de contexto não contém os labels do enum.
create table if not exists public.studio_clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cpf text,
  email text,
  phone text,
  address text,
  city text not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  shoot_type text,
  status text not null default 'lead'
    check (status in ('lead', 'budget', 'active', 'completed', 'archived')),
  business_value numeric(12,2)
);

create table if not exists public.studio_shoots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.studio_clients(id) on delete cascade,
  city text not null,
  shoot_type text not null,
  shoot_date date,
  photos_delivered integer not null default 0 check (photos_delivered >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  business_value numeric(12,2) not null default 0,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'canceled'))
);

create table if not exists public.studio_followups (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  city text not null,
  desired_shoot_type text not null,
  estimated_value numeric(12,2),
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'lost', 'converted')),
  follow_up_date date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- COMERCIAL / CRM
-- =============================================================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text,
  whatsapp text,
  source text,
  estimated_value numeric(12,2) default 0,
  stage_id uuid references public.lead_stages(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  notes text,
  next_followup_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  niche text,
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  won_at timestamptz,
  instagram text,
  whatsapp_do_not_contact boolean not null default false,
  first_contact_message text not null default 'Olá, tudo bem com você?'
    check (btrim(first_contact_message) <> ''),
  google_maps_url text
    check (google_maps_url is null or btrim(google_maps_url) <> ''),
  city text check (city is null or btrim(city) <> '')
);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'note',
  body text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.sales_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  lead_id uuid references public.leads(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'meeting',
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  link text,
  notes text,
  created_at timestamptz not null default now(),
  constraint sales_events_dates_valid
    check (end_at is null or end_at >= start_at)
);

create table if not exists public.sales_tiles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_id uuid not null references public.clients(id) on delete cascade,
  stage text default 'contacted',
  estimated_value numeric(12,2) default 0,
  contact_date timestamptz default now(),
  follow_up_date timestamptz,
  time_spent_seconds integer default 0,
  notes text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_kanban_columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  accent text default '#6366f1',
  position integer not null default 0,
  base text default 'custom',
  is_custom boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_kanban_columns_user_title_unique unique (user_id, title)
);

create table if not exists public.lead_script_flows (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  script_key text not null default 'vehicle_store',
  script_version integer not null default 1 check (script_version > 0),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  current_step integer not null default 0 check (current_step >= 0),
  answers jsonb not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_script_flows_answers_object
    check (jsonb_typeof(answers) = 'object')
);

-- =============================================================================
-- ROBOS DE PROSPECCAO
-- =============================================================================
create table if not exists public.prospecta_bot_configs (
  id uuid primary key default gen_random_uuid(),
  slug text not null
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (btrim(name) <> ''),
  lead_owner_id uuid references public.profiles(id) on delete set null,
  owner_email text not null check (btrim(owner_email) <> ''),
  search_term text not null check (btrim(search_term) <> ''),
  niche text not null check (btrim(niche) <> ''),
  cities text[] not null default '{}',
  min_reviews integer not null default 0 check (min_reviews >= 0),
  estimated_ticket numeric(14,2) not null check (estimated_ticket >= 0),
  headless boolean not null default true,
  max_scrolls integer not null default 10 check (max_scrolls > 0),
  excluded_words text[] not null default '{}',
  included_words text[] not null default '{}',
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  min_reviews_enabled boolean not null default true,
  website_filter text not null default 'without'
    check (website_filter in ('any', 'with', 'without')),
  phone_filter text not null default 'any'
    check (phone_filter in ('any', 'with', 'without')),
  excluded_words_enabled boolean not null default true,
  included_words_enabled boolean not null default true,
  initial_message text not null default 'Olá, tudo bem com você?'
    check (btrim(initial_message) <> '')
);

create table if not exists public.prospecta_bot_checkpoints (
  bot_id uuid not null references public.prospecta_bot_configs(id)
    on delete cascade,
  process_name text not null check (btrim(process_name) <> ''),
  state jsonb not null default '{}'
    check (jsonb_typeof(state) = 'object'),
  status text not null default 'idle' check (btrim(status) <> ''),
  runner_id text,
  lease_expires_at timestamptz,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bot_id, process_name),
  constraint prospecta_bot_checkpoints_lease_pair check (
    (runner_id is null and lease_expires_at is null)
    or (runner_id is not null and lease_expires_at is not null)
  )
);

create table if not exists public.prospecta_bot_controls (
  bot_id uuid primary key references public.prospecta_bot_configs(id)
    on delete cascade,
  command text not null
    check (command in ('rodando', 'pausado', 'parado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  target_runner_id text,
  request_id uuid not null default gen_random_uuid(),
  requested_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

create table if not exists public.prospecta_bot_runners (
  id text primary key check (btrim(id) <> ''),
  name text not null check (btrim(name) <> ''),
  environment text not null check (btrim(environment) <> ''),
  status text not null default 'online',
  metadata jsonb not null default '{}'
    check (jsonb_typeof(metadata) = 'object'),
  heartbeat_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospecta_bot_events (
  id bigint generated always as identity primary key,
  event_id uuid not null default gen_random_uuid() unique,
  bot_id uuid not null references public.prospecta_bot_configs(id)
    on delete cascade,
  process_name text not null check (btrim(process_name) <> ''),
  runner_id text,
  event_type text not null check (btrim(event_type) <> ''),
  level text not null default 'info',
  message text not null check (btrim(message) <> ''),
  data jsonb not null default '{}'
    check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now()
);

-- =============================================================================
-- ROBOS DE MENSAGENS / WHATSAPP
-- =============================================================================
create table if not exists public.prospecta_whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'disconnected'
    check (status in (
      'disconnected', 'connecting', 'qr_pending', 'ready', 'error'
    )),
  runner_id text,
  connected_number text,
  qr_code_data_url text,
  qr_generated_at timestamptz,
  last_error text,
  last_seen_at timestamptz,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.prospecta_message_bot_configs (
  id uuid primary key default gen_random_uuid(),
  slug text not null
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (btrim(name) <> ''),
  created_by uuid not null references public.profiles(id) on delete cascade,
  lead_owner_id uuid not null references public.profiles(id) on delete cascade,
  whatsapp_session_id uuid not null
    references public.prospecta_whatsapp_sessions(id) on delete restrict,
  niche text not null check (btrim(niche) <> ''),
  source_stage_id uuid not null
    references public.lead_stages(id) on delete restrict,
  target_stage_id uuid not null
    references public.lead_stages(id) on delete restrict,
  message_template text not null check (btrim(message_template) <> ''),
  min_interval_seconds integer not null check (min_interval_seconds >= 60),
  max_interval_seconds integer not null check (
    max_interval_seconds >= min_interval_seconds
    and max_interval_seconds <= 2592000
  ),
  max_messages_per_hour integer not null
    check (max_messages_per_hour between 1 and 100),
  weekly_schedule jsonb not null
    check (jsonb_typeof(weekly_schedule) = 'object'),
  timezone text not null default 'America/Sao_Paulo'
    check (timezone = 'America/Sao_Paulo'),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint prospecta_message_bots_stage_transition_valid
    check (source_stage_id <> target_stage_id)
);

create table if not exists public.prospecta_message_bot_controls (
  bot_id uuid primary key
    references public.prospecta_message_bot_configs(id) on delete cascade,
  command text not null
    check (command in ('rodando', 'pausado', 'parado')),
  target_runner_id text,
  request_id uuid not null default gen_random_uuid(),
  requested_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospecta_message_bot_runtime (
  bot_id uuid primary key
    references public.prospecta_message_bot_configs(id) on delete cascade,
  runner_id text,
  status text not null default 'idle'
    check (status in (
      'idle', 'starting', 'waiting_qr', 'running', 'paused',
      'outside_schedule', 'hourly_limit', 'no_leads', 'stopped', 'failed'
    )),
  sent_count bigint not null default 0 check (sent_count >= 0),
  invalid_count bigint not null default 0 check (invalid_count >= 0),
  failed_count bigint not null default 0 check (failed_count >= 0),
  current_lead_id uuid references public.leads(id) on delete set null,
  next_send_at timestamptz,
  heartbeat_at timestamptz,
  last_sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospecta_message_deliveries (
  id bigint generated always as identity primary key,
  bot_id uuid not null
    references public.prospecta_message_bot_configs(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  whatsapp_session_id uuid not null
    references public.prospecta_whatsapp_sessions(id) on delete restrict,
  phone_normalized text not null check (btrim(phone_normalized) <> ''),
  status text not null default 'claimed'
    check (status in ('claimed', 'sent', 'invalid', 'failed')),
  claim_token uuid not null default gen_random_uuid() unique,
  claimed_by text not null,
  lease_expires_at timestamptz not null,
  attempt_count integer not null default 1 check (attempt_count > 0),
  error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- INDICES
-- =============================================================================
create index if not exists user_roles_user_id_idx
  on public.user_roles(user_id);
create index if not exists team_members_user_id_idx
  on public.team_members(user_id);
create index if not exists tasks_assignee_id_idx
  on public.tasks(assignee_id);
create index if not exists tasks_client_id_idx
  on public.tasks(client_id);
create index if not exists tasks_team_id_idx
  on public.tasks(team_id);
create index if not exists tasks_status_idx
  on public.tasks(status);
create index if not exists comments_task_id_idx
  on public.comments(task_id);
create index if not exists time_entries_task_id_idx
  on public.time_entries(task_id);
create index if not exists time_entries_user_id_idx
  on public.time_entries(user_id);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, read);
create index if not exists client_collaborators_client_id_idx
  on public.client_collaborators(client_id);
create index if not exists client_services_client_id_idx
  on public.client_services(client_id);
create index if not exists leads_owner_id_idx
  on public.leads(owner_id);
create index if not exists leads_stage_id_idx
  on public.leads(stage_id);
create index if not exists leads_created_at_idx
  on public.leads(created_at desc);
create index if not exists leads_instagram_idx
  on public.leads(instagram) where instagram is not null;
create index if not exists lead_activities_lead_id_idx
  on public.lead_activities(lead_id);
create index if not exists sales_events_owner_start_idx
  on public.sales_events(owner_id, start_at);
create index if not exists prospecta_events_bot_created_idx
  on public.prospecta_bot_events(bot_id, created_at desc);
create unique index if not exists prospecta_bot_configs_slug_active_uidx
  on public.prospecta_bot_configs(slug)
  where deleted_at is null;
create index if not exists prospecta_bot_configs_owner_idx
  on public.prospecta_bot_configs(lead_owner_id)
  where deleted_at is null;
create index if not exists prospecta_bot_checkpoints_lease_idx
  on public.prospecta_bot_checkpoints(lease_expires_at)
  where lease_expires_at is not null;
create index if not exists prospecta_runners_heartbeat_idx
  on public.prospecta_bot_runners(heartbeat_at desc);
create unique index if not exists prospecta_message_bots_slug_active_uidx
  on public.prospecta_message_bot_configs(slug)
  where deleted_at is null;
create index if not exists prospecta_message_bots_owner_niche_idx
  on public.prospecta_message_bot_configs(
    lead_owner_id, niche, source_stage_id
  )
  where deleted_at is null;
create unique index if not exists prospecta_message_delivery_bot_lead_uidx
  on public.prospecta_message_deliveries(bot_id, lead_id);
create index if not exists prospecta_message_deliveries_bot_status_idx
  on public.prospecta_message_deliveries(bot_id, status, created_at);
create index if not exists prospecta_message_deliveries_lease_idx
  on public.prospecta_message_deliveries(lease_expires_at)
  where status = 'claimed';
create index if not exists prospecta_leads_message_eligibility_idx
  on public.leads(owner_id, source, stage_id, created_at)
  where not whatsapp_do_not_contact
    and (phone is not null or whatsapp is not null);
create index if not exists prospecta_leads_message_niche_idx
  on public.leads(owner_id, niche, stage_id, created_at)
  where not whatsapp_do_not_contact
    and (phone is not null or whatsapp is not null);

-- =============================================================================
-- FUNCOES DE SEGURANCA E GERAIS
-- =============================================================================
create or replace function public.has_role(
  _user_id uuid,
  _role public.app_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function public.is_leader(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'leader'::public.app_role);
$$;

create or replace function public.is_leader_or_manager(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'leader'::public.app_role)
      or public.has_role(_user_id, 'manager'::public.app_role);
$$;

create or replace function public.is_commercial(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'commercial'::public.app_role);
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set email = excluded.email,
      name = coalesce(nullif(public.profiles.name, ''), excluded.name);

  insert into public.user_roles (user_id, role)
  values (new.id, 'collaborator')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Impede que um usuário comum altere os próprios campos administrativos.
create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_leader(auth.uid())
     and (
       new.email is distinct from old.email
       or new.hourly_rate is distinct from old.hourly_rate
       or new.contract_start is distinct from old.contract_start
       or new.contract_end is distinct from old.contract_end
       or new.is_active is distinct from old.is_active
       or new.salary is distinct from old.salary
       or new.tax_rate is distinct from old.tax_rate
       or new.hire_date is distinct from old.hire_date
     )
  then
    raise exception 'Somente líderes podem alterar dados administrativos';
  end if;
  return new;
end;
$$;

create or replace function public.sync_team_client_collaborators()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.client_collaborators (
      client_id, user_id, team_id, source
    )
    select new.client_id, tm.user_id, new.team_id, 'team'
    from public.team_members tm
    join public.clients c
      on c.id = new.client_id
     and c.status = 'active'
    where tm.team_id = new.team_id
    on conflict do nothing;
    return new;
  end if;

  delete from public.client_collaborators
  where client_id = old.client_id
    and team_id = old.team_id
    and source = 'team';
  return old;
end;
$$;

create or replace function public.sync_team_member_clients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.client_collaborators (
      client_id, user_id, team_id, source
    )
    select tc.client_id, new.user_id, new.team_id, 'team'
    from public.team_clients tc
    join public.clients c
      on c.id = tc.client_id
     and c.status = 'active'
    where tc.team_id = new.team_id
    on conflict do nothing;
    return new;
  end if;

  delete from public.client_collaborators
  where user_id = old.user_id
    and team_id = old.team_id
    and source = 'team';
  return old;
end;
$$;

create or replace function public.unlink_inactive_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'active' then
    delete from public.client_collaborators where client_id = new.id;
  elsif old.status <> 'active' and new.status = 'active' then
    insert into public.client_collaborators (
      client_id, user_id, team_id, source
    )
    select tc.client_id, tm.user_id, tc.team_id, 'team'
    from public.team_clients tc
    join public.team_members tm on tm.team_id = tc.team_id
    where tc.client_id = new.id
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.touch_lead_sales_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  new_is_won boolean;
begin
  new.updated_at := now();
  select coalesce(is_won, false)
    into new_is_won
  from public.lead_stages
  where id = new.stage_id;

  if new_is_won and old.stage_id is distinct from new.stage_id then
    new.won_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.prospecta_move_lead_maps_note()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if nullif(btrim(new.google_maps_url), '') is null
     and btrim(coalesce(new.notes, '')) ~*
       '^https?://(([^/]+\.)?google\.(com|com\.br)/maps|maps\.app\.goo\.gl/|goo\.gl/maps)'
  then
    new.google_maps_url := btrim(new.notes);
    new.notes := null;
  end if;
  return new;
end;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_profiles_protect_admin_fields on public.profiles;
create trigger trg_profiles_protect_admin_fields
before update on public.profiles
for each row execute function public.protect_profile_admin_fields();

drop trigger if exists trg_tasks_updated on public.tasks;
create trigger trg_tasks_updated
before update on public.tasks
for each row execute function public.touch_updated_at();

drop trigger if exists trg_studio_sessions_updated on public.studio_sessions;
create trigger trg_studio_sessions_updated
before update on public.studio_sessions
for each row execute function public.touch_updated_at();

drop trigger if exists trg_studio_clients_updated on public.studio_clients;
create trigger trg_studio_clients_updated
before update on public.studio_clients
for each row execute function public.touch_updated_at();

drop trigger if exists trg_studio_shoots_updated on public.studio_shoots;
create trigger trg_studio_shoots_updated
before update on public.studio_shoots
for each row execute function public.touch_updated_at();

drop trigger if exists trg_studio_followups_updated on public.studio_followups;
create trigger trg_studio_followups_updated
before update on public.studio_followups
for each row execute function public.touch_updated_at();

drop trigger if exists trg_sales_tiles_updated on public.sales_tiles;
create trigger trg_sales_tiles_updated
before update on public.sales_tiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_user_kanban_columns_updated
  on public.user_kanban_columns;
create trigger trg_user_kanban_columns_updated
before update on public.user_kanban_columns
for each row execute function public.touch_updated_at();

drop trigger if exists trg_lead_script_flows_updated
  on public.lead_script_flows;
create trigger trg_lead_script_flows_updated
before update on public.lead_script_flows
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_lead_sales_fields on public.leads;
create trigger trg_touch_lead_sales_fields
before update on public.leads
for each row execute function public.touch_lead_sales_fields();

drop trigger if exists prospecta_leads_move_maps_note on public.leads;
create trigger prospecta_leads_move_maps_note
before insert or update of notes, google_maps_url on public.leads
for each row execute function public.prospecta_move_lead_maps_note();

drop trigger if exists trg_sync_team_client_collaborators
  on public.team_clients;
create trigger trg_sync_team_client_collaborators
after insert or delete on public.team_clients
for each row execute function public.sync_team_client_collaborators();

drop trigger if exists trg_sync_team_member_clients on public.team_members;
create trigger trg_sync_team_member_clients
after insert or delete on public.team_members
for each row execute function public.sync_team_member_clients();

drop trigger if exists trg_unlink_inactive_client on public.clients;
create trigger trg_unlink_inactive_client
after update of status on public.clients
for each row
when (old.status is distinct from new.status)
execute function public.unlink_inactive_client();

-- Versão otimista dos registros dos robôs.
create or replace function public.prospecta_touch_version()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.prospecta_touch_row()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create or replace function public.prospecta_log_control_event()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  insert into public.prospecta_bot_events (
    bot_id, process_name, runner_id, event_type, message, data
  )
  values (
    new.bot_id,
    'control',
    new.target_runner_id,
    'comando_solicitado',
    'Comando solicitado: ' || new.command,
    jsonb_build_object(
      'comando', new.command,
      'request_id', new.request_id,
      'target_runner_id', new.target_runner_id
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_prospecta_bot_configs_version
  on public.prospecta_bot_configs;
create trigger trg_prospecta_bot_configs_version
before update on public.prospecta_bot_configs
for each row execute function public.prospecta_touch_version();

drop trigger if exists trg_prospecta_bot_checkpoints_version
  on public.prospecta_bot_checkpoints;
create trigger trg_prospecta_bot_checkpoints_version
before update on public.prospecta_bot_checkpoints
for each row execute function public.prospecta_touch_version();

drop trigger if exists trg_prospecta_bot_controls_touch
  on public.prospecta_bot_controls;
create trigger trg_prospecta_bot_controls_touch
before update on public.prospecta_bot_controls
for each row execute function public.prospecta_touch_row();

drop trigger if exists trg_prospecta_bot_controls_event
  on public.prospecta_bot_controls;
create trigger trg_prospecta_bot_controls_event
after insert or update of command, request_id
on public.prospecta_bot_controls
for each row execute function public.prospecta_log_control_event();

drop trigger if exists trg_prospecta_bot_runners_touch
  on public.prospecta_bot_runners;
create trigger trg_prospecta_bot_runners_touch
before update on public.prospecta_bot_runners
for each row execute function public.prospecta_touch_row();

drop trigger if exists trg_prospecta_whatsapp_sessions_version
  on public.prospecta_whatsapp_sessions;
create trigger trg_prospecta_whatsapp_sessions_version
before update on public.prospecta_whatsapp_sessions
for each row execute function public.prospecta_touch_version();

drop trigger if exists trg_prospecta_message_bot_configs_version
  on public.prospecta_message_bot_configs;
create trigger trg_prospecta_message_bot_configs_version
before update on public.prospecta_message_bot_configs
for each row execute function public.prospecta_touch_version();

drop trigger if exists trg_prospecta_message_controls_touch
  on public.prospecta_message_bot_controls;
create trigger trg_prospecta_message_controls_touch
before update on public.prospecta_message_bot_controls
for each row execute function public.prospecta_touch_row();

drop trigger if exists trg_prospecta_message_runtime_touch
  on public.prospecta_message_bot_runtime;
create trigger trg_prospecta_message_runtime_touch
before update on public.prospecta_message_bot_runtime
for each row execute function public.prospecta_touch_row();

drop trigger if exists trg_prospecta_message_deliveries_touch
  on public.prospecta_message_deliveries;
create trigger trg_prospecta_message_deliveries_touch
before update on public.prospecta_message_deliveries
for each row execute function public.prospecta_touch_row();

-- =============================================================================
-- SEEDS OBRIGATORIOS
-- =============================================================================
insert into public.kanban_columns (id, title, accent, "order", base)
values
  ('todo', 'A Fazer', 'bg-muted-foreground', 0, 'todo'),
  ('in_progress', 'Em Andamento', 'bg-primary', 1, 'in_progress'),
  ('review', 'Em Revisão', 'bg-warning', 2, 'review'),
  ('done', 'Concluído', 'bg-success', 3, 'done')
on conflict (id) do update
set title = excluded.title,
    accent = excluded.accent,
    "order" = excluded."order",
    base = excluded.base;

insert into public.lead_stages (
  name, color, position, is_won, is_lost
)
values
  ('Novo Lead', '#3b82f6', 0, false, false),
  ('Abordagem', '#8b5cf6', 1, false, false),
  ('Follow-up', '#f59e0b', 2, false, false),
  ('Proposta', '#0ea5e9', 3, false, false),
  ('Negociação', '#ec4899', 4, false, false),
  ('Vendido', '#10b981', 5, true, false),
  ('Perdido', '#ef4444', 6, false, true)
on conflict ((lower(name))) do update
set color = excluded.color,
    position = excluded.position,
    is_won = excluded.is_won,
    is_lost = excluded.is_lost;

insert into public.finance_settings (key, value)
values
  ('opening_balance', '25000'::jsonb),
  ('default_tax_rate', '32'::jsonb),
  ('custom_categories', '[]'::jsonb)
on conflict (key) do nothing;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_roles', 'teams', 'team_members', 'clients',
    'kanban_columns', 'services', 'lead_stages', 'tasks', 'comments',
    'time_entries', 'notifications', 'client_teams', 'team_clients',
    'client_satisfaction_history', 'client_services',
    'client_collaborators', 'expenses', 'cash_adjustments',
    'finance_settings', 'extra_services', 'team_notes',
    'studio_sessions', 'studio_expenses', 'studio_clients',
    'studio_shoots', 'studio_followups', 'leads', 'lead_activities',
    'sales_events', 'sales_tiles', 'user_kanban_columns',
    'lead_script_flows', 'prospecta_bot_configs',
    'prospecta_bot_checkpoints', 'prospecta_bot_controls',
    'prospecta_bot_runners', 'prospecta_bot_events',
    'prospecta_whatsapp_sessions', 'prospecta_message_bot_configs',
    'prospecta_message_bot_controls', 'prospecta_message_bot_runtime',
    'prospecta_message_deliveries'
  ] loop
    execute format(
      'alter table public.%I enable row level security',
      table_name
    );
  end loop;
end $$;

-- Limpa somente as policies com nomes gerenciados por este instalador.
do $$
declare
  policy_item record;
begin
  for policy_item in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and policyname like 'leadflow_%'
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_item.policyname,
      policy_item.schemaname,
      policy_item.tablename
    );
  end loop;
end $$;

create policy leadflow_profiles_select
on public.profiles for select to authenticated using (true);
create policy leadflow_profiles_update_self
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());
create policy leadflow_profiles_admin
on public.profiles for all to authenticated
using (public.is_leader_or_manager(auth.uid()))
with check (public.is_leader_or_manager(auth.uid()));

create policy leadflow_roles_select
on public.user_roles for select to authenticated using (true);
create policy leadflow_roles_leader
on public.user_roles for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));

create policy leadflow_teams_select
on public.teams for select to authenticated using (true);
create policy leadflow_teams_admin
on public.teams for all to authenticated
using (public.is_leader_or_manager(auth.uid()))
with check (public.is_leader_or_manager(auth.uid()));

create policy leadflow_team_members_select
on public.team_members for select to authenticated using (true);
create policy leadflow_team_members_admin
on public.team_members for all to authenticated
using (public.is_leader_or_manager(auth.uid()))
with check (public.is_leader_or_manager(auth.uid()));

create policy leadflow_clients_select
on public.clients for select to authenticated using (true);
create policy leadflow_clients_admin
on public.clients for all to authenticated
using (public.is_leader_or_manager(auth.uid()))
with check (public.is_leader_or_manager(auth.uid()));

create policy leadflow_kanban_columns_select
on public.kanban_columns for select to authenticated using (true);
create policy leadflow_kanban_columns_admin
on public.kanban_columns for all to authenticated
using (public.is_leader_or_manager(auth.uid()))
with check (public.is_leader_or_manager(auth.uid()));

create policy leadflow_tasks_select
on public.tasks for select to authenticated using (true);
create policy leadflow_tasks_insert
on public.tasks for insert to authenticated
with check (
  created_by = auth.uid()
  or assignee_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
);
create policy leadflow_tasks_update
on public.tasks for update to authenticated
using (
  created_by = auth.uid()
  or assignee_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
)
with check (
  created_by = auth.uid()
  or assignee_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
);
create policy leadflow_tasks_delete
on public.tasks for delete to authenticated
using (
  created_by = auth.uid()
  or assignee_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
);

create policy leadflow_comments_select
on public.comments for select to authenticated using (true);
create policy leadflow_comments_insert
on public.comments for insert to authenticated
with check (user_id = auth.uid());
create policy leadflow_comments_update
on public.comments for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy leadflow_comments_delete
on public.comments for delete to authenticated
using (
  user_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
);

create policy leadflow_time_entries_select
on public.time_entries for select to authenticated using (true);
create policy leadflow_time_entries_insert
on public.time_entries for insert to authenticated
with check (user_id = auth.uid());
create policy leadflow_time_entries_update
on public.time_entries for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy leadflow_time_entries_delete
on public.time_entries for delete to authenticated
using (
  user_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
);

create policy leadflow_notifications_select
on public.notifications for select to authenticated
using (user_id = auth.uid());
create policy leadflow_notifications_update
on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy leadflow_notifications_delete
on public.notifications for delete to authenticated
using (user_id = auth.uid());
create policy leadflow_notifications_insert
on public.notifications for insert to authenticated
with check (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.is_leader_or_manager(auth.uid())
  )
);

-- Tabelas de relacionamento e catálogo.
create policy leadflow_services_select
on public.services for select to authenticated using (true);
create policy leadflow_services_leader
on public.services for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));

create policy leadflow_client_services_select
on public.client_services for select to authenticated using (true);
create policy leadflow_client_services_leader
on public.client_services for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));

create policy leadflow_client_relations_select
on public.client_collaborators for select to authenticated using (true);
create policy leadflow_client_relations_admin
on public.client_collaborators for all to authenticated
using (public.is_leader_or_manager(auth.uid()))
with check (public.is_leader_or_manager(auth.uid()));

create policy leadflow_client_teams_select
on public.client_teams for select to authenticated using (true);
create policy leadflow_client_teams_admin
on public.client_teams for all to authenticated
using (public.is_leader_or_manager(auth.uid()))
with check (public.is_leader_or_manager(auth.uid()));

create policy leadflow_team_clients_select
on public.team_clients for select to authenticated using (true);
create policy leadflow_team_clients_admin
on public.team_clients for all to authenticated
using (public.is_leader_or_manager(auth.uid()))
with check (public.is_leader_or_manager(auth.uid()));

create policy leadflow_satisfaction_select
on public.client_satisfaction_history
for select to authenticated using (true);
create policy leadflow_satisfaction_insert
on public.client_satisfaction_history
for insert to authenticated
with check (recorded_by = auth.uid() or recorded_by is null);

-- Financeiro e notas.
create policy leadflow_expenses_leader
on public.expenses for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));
create policy leadflow_cash_leader
on public.cash_adjustments for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));
create policy leadflow_finance_settings_leader
on public.finance_settings for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));
create policy leadflow_extra_services_leader
on public.extra_services for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));
create policy leadflow_team_notes_leader
on public.team_notes for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));

-- Estúdio.
create policy leadflow_studio_sessions_leader
on public.studio_sessions for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));
create policy leadflow_studio_expenses_leader
on public.studio_expenses for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));
create policy leadflow_studio_clients_leader
on public.studio_clients for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));
create policy leadflow_studio_shoots_leader
on public.studio_shoots for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));
create policy leadflow_studio_followups_leader
on public.studio_followups for all to authenticated
using (public.is_leader(auth.uid()))
with check (public.is_leader(auth.uid()));

-- CRM.
create policy leadflow_lead_stages_select
on public.lead_stages for select to authenticated using (true);
create policy leadflow_lead_stages_admin
on public.lead_stages for all to authenticated
using (public.is_leader_or_manager(auth.uid()))
with check (public.is_leader_or_manager(auth.uid()));

create policy leadflow_leads_select
on public.leads for select to authenticated
using (
  public.is_leader_or_manager(auth.uid())
  or public.is_commercial(auth.uid())
  or owner_id = auth.uid()
);
create policy leadflow_leads_insert
on public.leads for insert to authenticated
with check (
  (
    public.is_leader_or_manager(auth.uid())
    or public.is_commercial(auth.uid())
  )
  and (
    (
      owner_id is null
      and public.is_leader_or_manager(auth.uid())
    )
    or exists (
      select 1
      from public.profiles owner_profile
      join public.user_roles owner_role
        on owner_role.user_id = owner_profile.id
      where owner_profile.id = owner_id
        and owner_profile.is_active
        and owner_role.role in ('leader', 'manager', 'commercial')
    )
  )
);
create policy leadflow_leads_update
on public.leads for update to authenticated
using (
  public.is_leader_or_manager(auth.uid())
  or owner_id = auth.uid()
)
with check (
  (
    owner_id is null
    and public.is_leader_or_manager(auth.uid())
  )
  or exists (
    select 1
    from public.profiles owner_profile
    join public.user_roles owner_role
      on owner_role.user_id = owner_profile.id
    where owner_profile.id = owner_id
      and owner_profile.is_active
      and owner_role.role in ('leader', 'manager', 'commercial')
  )
);
create policy leadflow_leads_delete
on public.leads for delete to authenticated
using (
  public.is_leader_or_manager(auth.uid())
  or owner_id = auth.uid()
);

create policy leadflow_lead_activities_select
on public.lead_activities for select to authenticated
using (
  public.is_leader_or_manager(auth.uid())
  or exists (
    select 1
    from public.leads
    where leads.id = lead_activities.lead_id
      and (
        leads.owner_id = auth.uid()
        or public.is_commercial(auth.uid())
      )
  )
);
create policy leadflow_lead_activities_write
on public.lead_activities for all to authenticated
using (
  user_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
)
with check (
  user_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
);

create policy leadflow_sales_events_select
on public.sales_events for select to authenticated
using (
  public.is_leader_or_manager(auth.uid())
  or public.is_commercial(auth.uid())
  or owner_id = auth.uid()
);
create policy leadflow_sales_events_write
on public.sales_events for all to authenticated
using (
  owner_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
)
with check (
  owner_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
);

create policy leadflow_sales_tiles_select
on public.sales_tiles for select to authenticated using (true);
create policy leadflow_sales_tiles_write
on public.sales_tiles for all to authenticated
using (
  owner_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
)
with check (
  owner_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
);

create policy leadflow_user_columns
on public.user_kanban_columns for all to authenticated
using (
  user_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
)
with check (
  user_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
);

create policy leadflow_script_flows
on public.lead_script_flows for all to authenticated
using (
  created_by = auth.uid()
  or public.is_leader_or_manager(auth.uid())
)
with check (
  created_by = auth.uid()
  or public.is_leader_or_manager(auth.uid())
);

-- Robôs de prospecção.
create policy leadflow_bot_configs_select
on public.prospecta_bot_configs for select to authenticated
using (
  deleted_at is null
  and (
    lead_owner_id = auth.uid()
    or public.is_leader_or_manager(auth.uid())
  )
);
create policy leadflow_bot_configs_write
on public.prospecta_bot_configs for all to authenticated
using (
  lead_owner_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
)
with check (
  lead_owner_id = auth.uid()
  or public.is_leader_or_manager(auth.uid())
);

create policy leadflow_bot_checkpoints_select
on public.prospecta_bot_checkpoints for select to authenticated
using (
  public.is_leader(auth.uid())
  or exists (
    select 1
    from public.prospecta_bot_configs config
    where config.id = bot_id
      and config.lead_owner_id = auth.uid()
      and config.deleted_at is null
  )
);
create policy leadflow_bot_controls_select
on public.prospecta_bot_controls for select to authenticated
using (
  public.is_leader(auth.uid())
  or exists (
    select 1
    from public.prospecta_bot_configs config
    where config.id = bot_id
      and config.lead_owner_id = auth.uid()
      and config.deleted_at is null
  )
);
create policy leadflow_bot_runners_select
on public.prospecta_bot_runners for select to authenticated
using (auth.uid() is not null);
create policy leadflow_bot_events_select
on public.prospecta_bot_events for select to authenticated
using (
  public.is_leader(auth.uid())
  or exists (
    select 1
    from public.prospecta_bot_configs config
    where config.id = bot_id
      and config.lead_owner_id = auth.uid()
      and config.deleted_at is null
  )
);

-- Robôs de mensagens.
create policy leadflow_whatsapp_sessions
on public.prospecta_whatsapp_sessions for all to authenticated
using (
  deleted_at is null
  and (
    owner_id = auth.uid()
    or public.is_leader(auth.uid())
  )
)
with check (
  owner_id = auth.uid()
  or public.is_leader(auth.uid())
);

create policy leadflow_message_configs
on public.prospecta_message_bot_configs for all to authenticated
using (
  deleted_at is null
  and (
    created_by = auth.uid()
    or public.is_leader(auth.uid())
  )
)
with check (
  public.is_leader(auth.uid())
  or (
    created_by = auth.uid()
    and lead_owner_id = auth.uid()
    and exists (
      select 1
      from public.prospecta_whatsapp_sessions session
      where session.id = whatsapp_session_id
        and session.owner_id = auth.uid()
        and session.deleted_at is null
    )
  )
);

create policy leadflow_message_controls_select
on public.prospecta_message_bot_controls for select to authenticated
using (
  public.is_leader(auth.uid())
  or exists (
    select 1
    from public.prospecta_message_bot_configs config
    where config.id = bot_id
      and config.created_by = auth.uid()
      and config.deleted_at is null
  )
);
create policy leadflow_message_runtime_select
on public.prospecta_message_bot_runtime for select to authenticated
using (
  public.is_leader(auth.uid())
  or exists (
    select 1
    from public.prospecta_message_bot_configs config
    where config.id = bot_id
      and config.created_by = auth.uid()
      and config.deleted_at is null
  )
);
create policy leadflow_message_deliveries_select
on public.prospecta_message_deliveries for select to authenticated
using (
  public.is_leader(auth.uid())
  or exists (
    select 1
    from public.prospecta_message_bot_configs config
    where config.id = bot_id
      and config.created_by = auth.uid()
      and config.deleted_at is null
  )
);

-- =============================================================================
-- RPCS DOS ROBOS
-- =============================================================================
create or replace function public.prospecta_is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = p_user_id
      and role = 'leader'::public.app_role
  );
$$;

create or replace function public.prospecta_claim_checkpoint(
  p_bot_id uuid,
  p_process_name text,
  p_runner_id text,
  p_lease_seconds integer default 300
)
returns setof public.prospecta_bot_checkpoints
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if btrim(coalesce(p_process_name, '')) = '' then
    raise exception 'Nome do processo é obrigatório';
  end if;
  if btrim(coalesce(p_runner_id, '')) = '' then
    raise exception 'Identificador do executor é obrigatório';
  end if;
  if p_lease_seconds < 1 or p_lease_seconds > 86400 then
    raise exception 'Duração do lease deve estar entre 1 e 86400 segundos';
  end if;

  return query
  insert into public.prospecta_bot_checkpoints (
    bot_id, process_name, status, runner_id, lease_expires_at
  )
  values (
    p_bot_id,
    p_process_name,
    'running',
    p_runner_id,
    clock_timestamp() + make_interval(secs => p_lease_seconds)
  )
  on conflict (bot_id, process_name) do update
  set status = 'running',
      runner_id = excluded.runner_id,
      lease_expires_at = excluded.lease_expires_at
  where prospecta_bot_checkpoints.runner_id = p_runner_id
     or prospecta_bot_checkpoints.lease_expires_at is null
     or prospecta_bot_checkpoints.lease_expires_at < clock_timestamp()
  returning prospecta_bot_checkpoints.*;
end;
$$;

create or replace function public.prospecta_save_checkpoint(
  p_bot_id uuid,
  p_process_name text,
  p_runner_id text,
  p_state jsonb,
  p_status text default 'running',
  p_expected_version bigint default null,
  p_lease_seconds integer default 300
)
returns setof public.prospecta_bot_checkpoints
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if jsonb_typeof(coalesce(p_state, '{}'::jsonb)) <> 'object' then
    raise exception 'Estado do checkpoint deve ser um objeto JSON';
  end if;
  if btrim(coalesce(p_status, '')) = '' then
    raise exception 'Status é obrigatório';
  end if;
  if p_lease_seconds < 1 or p_lease_seconds > 86400 then
    raise exception 'Duração do lease deve estar entre 1 e 86400 segundos';
  end if;

  return query
  update public.prospecta_bot_checkpoints
  set state = coalesce(p_state, '{}'::jsonb),
      status = p_status,
      lease_expires_at = clock_timestamp()
        + make_interval(secs => p_lease_seconds)
  where bot_id = p_bot_id
    and process_name = p_process_name
    and runner_id = p_runner_id
    and lease_expires_at >= clock_timestamp()
    and (p_expected_version is null or version = p_expected_version)
  returning prospecta_bot_checkpoints.*;
end;
$$;

create or replace function public.prospecta_release_checkpoint(
  p_bot_id uuid,
  p_process_name text,
  p_runner_id text,
  p_status text default 'idle',
  p_expected_version bigint default null
)
returns setof public.prospecta_bot_checkpoints
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if btrim(coalesce(p_status, '')) = '' then
    raise exception 'Status é obrigatório';
  end if;

  return query
  update public.prospecta_bot_checkpoints
  set status = p_status,
      runner_id = null,
      lease_expires_at = null
  where bot_id = p_bot_id
    and process_name = p_process_name
    and runner_id = p_runner_id
    and (p_expected_version is null or version = p_expected_version)
  returning prospecta_bot_checkpoints.*;
end;
$$;

create or replace function public.prospecta_can_access_bot(p_bot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is null
    or public.prospecta_is_admin(auth.uid())
    or exists (
      select 1
      from public.prospecta_bot_configs config
      where config.id = p_bot_id
        and config.lead_owner_id = auth.uid()
        and config.deleted_at is null
    );
$$;

create or replace function public.prospecta_get_bot_runtime(p_bot_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'config', to_jsonb(config),
    'control', (
      select to_jsonb(control)
      from public.prospecta_bot_controls control
      where control.bot_id = config.id
    ),
    'runner', (
      select to_jsonb(runner)
      from public.prospecta_bot_runners runner
      join public.prospecta_bot_controls control
        on control.target_runner_id = runner.id
      where control.bot_id = config.id
    ),
    'checkpoints', coalesce((
      select jsonb_object_agg(checkpoint.process_name, to_jsonb(checkpoint))
      from public.prospecta_bot_checkpoints checkpoint
      where checkpoint.bot_id = config.id
    ), '{}'::jsonb)
  )
  from public.prospecta_bot_configs config
  where config.id = p_bot_id
    and config.deleted_at is null
    and public.prospecta_can_access_bot(config.id);
$$;

create or replace function public.prospecta_list_bot_runtimes()
returns table (runtime jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select public.prospecta_get_bot_runtime(config.id)
  from public.prospecta_bot_configs config
  where config.deleted_at is null
    and public.prospecta_can_access_bot(config.id)
  order by config.name;
$$;

create or replace function public.prospecta_get_bot_events(
  p_bot_id uuid,
  p_limit integer default 30
)
returns setof public.prospecta_bot_events
language sql
stable
security definer
set search_path = public
as $$
  select event.*
  from public.prospecta_bot_events event
  where event.bot_id = p_bot_id
    and public.prospecta_can_access_bot(p_bot_id)
  order by event.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 200));
$$;

create or replace function public.prospecta_get_recent_bot_events(
  p_limit integer default 20
)
returns setof public.prospecta_bot_events
language sql
stable
security definer
set search_path = public
as $$
  select event.*
  from public.prospecta_bot_events event
  where public.prospecta_can_access_bot(event.bot_id)
  order by event.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

create or replace function public.prospecta_list_runners()
returns table (
  id text,
  name text,
  environment text,
  status text,
  heartbeat_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    runner.id,
    runner.name,
    runner.environment,
    runner.status,
    runner.heartbeat_at
  from public.prospecta_bot_runners runner
  where runner.status = 'online'
    and runner.heartbeat_at >= clock_timestamp() - interval '90 seconds'
  order by runner.name;
$$;

create or replace function public.prospecta_request_command(
  p_bot_id uuid,
  p_command text,
  p_target_runner_id text default null
)
returns setof public.prospecta_bot_controls
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if btrim(coalesce(p_command, '')) = '' then
    raise exception 'Comando é obrigatório';
  end if;
  if p_command not in ('rodando', 'pausado', 'parado') then
    raise exception 'Comando inválido';
  end if;
  if not public.prospecta_can_access_bot(p_bot_id) then
    raise exception 'Acesso negado ao bot';
  end if;

  return query
  insert into public.prospecta_bot_controls (
    bot_id, command, target_runner_id, request_id,
    requested_at, acknowledged_at
  )
  values (
    p_bot_id,
    p_command,
    nullif(btrim(p_target_runner_id), ''),
    gen_random_uuid(),
    clock_timestamp(),
    null
  )
  on conflict (bot_id) do update
  set command = excluded.command,
      target_runner_id = excluded.target_runner_id,
      request_id = excluded.request_id,
      requested_at = excluded.requested_at,
      acknowledged_at = null
  returning prospecta_bot_controls.*;
end;
$$;

create or replace function public.prospecta_delete_bot(
  p_bot_id uuid,
  p_expected_version bigint
)
returns setof public.prospecta_bot_configs
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.prospecta_can_access_bot(p_bot_id) then
    raise exception 'Acesso negado ao bot';
  end if;

  return query
  update public.prospecta_bot_configs
  set deleted_at = now()
  where id = p_bot_id
    and version = p_expected_version
    and deleted_at is null
  returning prospecta_bot_configs.*;
end;
$$;

create or replace function public.prospecta_can_access_message_bot(
  p_bot_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is null
    or public.prospecta_is_admin(auth.uid())
    or exists (
      select 1
      from public.prospecta_message_bot_configs config
      where config.id = p_bot_id
        and config.deleted_at is null
        and config.created_by = auth.uid()
    );
$$;

create or replace function public.prospecta_list_message_bot_runtimes()
returns table (runtime jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'config', to_jsonb(config),
    'session', to_jsonb(session),
    'control', to_jsonb(control),
    'runtime', to_jsonb(runtime_state)
  )
  from public.prospecta_message_bot_configs config
  join public.prospecta_whatsapp_sessions session
    on session.id = config.whatsapp_session_id
  left join public.prospecta_message_bot_controls control
    on control.bot_id = config.id
  left join public.prospecta_message_bot_runtime runtime_state
    on runtime_state.bot_id = config.id
  where config.deleted_at is null
    and session.deleted_at is null
    and public.prospecta_can_access_message_bot(config.id)
  order by config.name;
$$;

create or replace function public.prospecta_list_message_niches(
  p_owner_id uuid
)
returns table (niche text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select distinct btrim(lead.value) as niche
  from (
    select owner_id, source as value from public.leads
    union all
    select owner_id, niche as value from public.leads
  ) lead
  where lead.owner_id = p_owner_id
    and btrim(coalesce(lead.value, '')) <> ''
    and (
      auth.uid() is null
      or p_owner_id = auth.uid()
      or public.prospecta_is_admin(auth.uid())
    )
  order by niche;
$$;

create or replace function public.prospecta_request_message_bot_command(
  p_bot_id uuid,
  p_command text,
  p_target_runner_id text default null
)
returns setof public.prospecta_message_bot_controls
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_command not in ('rodando', 'pausado', 'parado') then
    raise exception 'Comando inválido';
  end if;
  if not public.prospecta_can_access_message_bot(p_bot_id) then
    raise exception 'Acesso negado ao bot de mensagens';
  end if;
  if p_command = 'rodando'
     and btrim(coalesce(p_target_runner_id, '')) = '' then
    raise exception 'Executor é obrigatório para iniciar';
  end if;
  if p_command = 'rodando' and exists (
    select 1
    from public.prospecta_message_bot_configs config
    join public.prospecta_whatsapp_sessions session
      on session.id = config.whatsapp_session_id
    where config.id = p_bot_id
      and session.runner_id is not null
      and session.status in ('connecting', 'qr_pending', 'ready')
      and session.last_seen_at >= clock_timestamp() - interval '2 minutes'
      and session.runner_id <> p_target_runner_id
  ) then
    raise exception 'A sessão está conectada em outro executor';
  end if;

  return query
  insert into public.prospecta_message_bot_controls (
    bot_id, command, target_runner_id, request_id,
    requested_at, acknowledged_at
  )
  values (
    p_bot_id,
    p_command,
    nullif(btrim(p_target_runner_id), ''),
    gen_random_uuid(),
    clock_timestamp(),
    null
  )
  on conflict (bot_id) do update
  set command = excluded.command,
      target_runner_id = coalesce(
        excluded.target_runner_id,
        prospecta_message_bot_controls.target_runner_id
      ),
      request_id = excluded.request_id,
      requested_at = excluded.requested_at,
      acknowledged_at = null
  returning prospecta_message_bot_controls.*;
end;
$$;

create or replace function public.prospecta_claim_message_lead(
  p_bot_id uuid,
  p_runner_id text,
  p_lease_seconds integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_config public.prospecta_message_bot_configs%rowtype;
  v_delivery public.prospecta_message_deliveries%rowtype;
  v_lead public.leads%rowtype;
  v_phone text;
begin
  if btrim(coalesce(p_runner_id, '')) = '' then
    raise exception 'Executor é obrigatório';
  end if;
  if p_lease_seconds < 60 or p_lease_seconds > 3600 then
    raise exception 'Lease inválido';
  end if;

  select *
  into v_config
  from public.prospecta_message_bot_configs
  where id = p_bot_id
    and deleted_at is null;

  if not found then
    return null;
  end if;

  if not exists (
    select 1
    from public.prospecta_message_bot_controls control
    where control.bot_id = p_bot_id
      and control.command = 'rodando'
      and control.target_runner_id = p_runner_id
  ) then
    return null;
  end if;

  select delivery.*
  into v_delivery
  from public.prospecta_message_deliveries delivery
  where delivery.bot_id = p_bot_id
    and delivery.status = 'claimed'
    and delivery.lease_expires_at < clock_timestamp()
  order by delivery.created_at
  for update skip locked
  limit 1;

  if found then
    update public.prospecta_message_deliveries
    set claim_token = gen_random_uuid(),
        claimed_by = p_runner_id,
        lease_expires_at = clock_timestamp()
          + make_interval(secs => p_lease_seconds),
        attempt_count = attempt_count + 1
    where id = v_delivery.id
    returning * into v_delivery;

    select *
    into v_lead
    from public.leads
    where id = v_delivery.lead_id;

    if not found
       or v_lead.owner_id is distinct from v_config.lead_owner_id
       or not (
         coalesce(v_lead.niche, '') = v_config.niche
         or coalesce(v_lead.source, '') = v_config.niche
       )
       or v_lead.stage_id is distinct from v_config.source_stage_id
       or coalesce(v_lead.whatsapp_do_not_contact, false)
    then
      update public.prospecta_message_deliveries
      set status = 'failed',
          error_code = 'lead_no_longer_eligible',
          lease_expires_at = clock_timestamp()
      where id = v_delivery.id;
      return null;
    end if;
  else
    select lead.*
    into v_lead
    from public.leads lead
    where lead.owner_id = v_config.lead_owner_id
      and (
        coalesce(lead.niche, '') = v_config.niche
        or coalesce(lead.source, '') = v_config.niche
      )
      and lead.stage_id = v_config.source_stage_id
      and not coalesce(lead.whatsapp_do_not_contact, false)
      and regexp_replace(
        coalesce(nullif(lead.whatsapp, ''), lead.phone, ''),
        '[^0-9]',
        '',
        'g'
      ) <> ''
      and not exists (
        select 1
        from public.prospecta_message_deliveries delivery
        where delivery.bot_id = p_bot_id
          and delivery.lead_id = lead.id
      )
    order by lead.created_at, lead.id
    for update skip locked
    limit 1;

    if not found then
      return null;
    end if;

    v_phone := coalesce(nullif(v_lead.whatsapp, ''), v_lead.phone);
    insert into public.prospecta_message_deliveries (
      bot_id,
      lead_id,
      whatsapp_session_id,
      phone_normalized,
      claimed_by,
      lease_expires_at
    )
    values (
      p_bot_id,
      v_lead.id,
      v_config.whatsapp_session_id,
      regexp_replace(v_phone, '[^0-9]', '', 'g'),
      p_runner_id,
      clock_timestamp() + make_interval(secs => p_lease_seconds)
    )
    returning * into v_delivery;
  end if;

  return jsonb_build_object(
    'delivery_id', v_delivery.id,
    'claim_token', v_delivery.claim_token,
    'lead_id', v_lead.id,
    'name', v_lead.name,
    'company', v_lead.company,
    'niche', v_config.niche,
    'phone', coalesce(nullif(v_lead.whatsapp, ''), v_lead.phone)
  );
end;
$$;

create or replace function public.prospecta_finalize_message_delivery(
  p_delivery_id bigint,
  p_claim_token uuid,
  p_status text,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_delivery public.prospecta_message_deliveries%rowtype;
  v_target_stage uuid;
begin
  if p_status not in ('sent', 'invalid', 'failed') then
    raise exception 'Status final inválido';
  end if;

  select *
  into v_delivery
  from public.prospecta_message_deliveries
  where id = p_delivery_id
    and claim_token = p_claim_token
    and status = 'claimed'
  for update;

  if not found then
    return false;
  end if;

  update public.prospecta_message_deliveries
  set status = p_status,
      error_code = left(nullif(p_error_code, ''), 200),
      sent_at = case
        when p_status = 'sent' then clock_timestamp()
        else null
      end,
      lease_expires_at = clock_timestamp()
  where id = p_delivery_id;

  if p_status = 'sent' then
    select target_stage_id
    into v_target_stage
    from public.prospecta_message_bot_configs
    where id = v_delivery.bot_id;

    update public.leads
    set stage_id = v_target_stage,
        updated_at = clock_timestamp()
    where id = v_delivery.lead_id;
  end if;

  insert into public.prospecta_message_bot_runtime (
    bot_id, sent_count, invalid_count, failed_count
  )
  values (
    v_delivery.bot_id,
    case when p_status = 'sent' then 1 else 0 end,
    case when p_status = 'invalid' then 1 else 0 end,
    case when p_status = 'failed' then 1 else 0 end
  )
  on conflict (bot_id) do update
  set sent_count = prospecta_message_bot_runtime.sent_count
        + case when p_status = 'sent' then 1 else 0 end,
      invalid_count = prospecta_message_bot_runtime.invalid_count
        + case when p_status = 'invalid' then 1 else 0 end,
      failed_count = prospecta_message_bot_runtime.failed_count
        + case when p_status = 'failed' then 1 else 0 end;

  return true;
end;
$$;

create or replace function public.prospecta_message_sent_last_hour(
  p_bot_id uuid
)
returns integer
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select count(*)::integer
  from public.prospecta_message_deliveries
  where bot_id = p_bot_id
    and status = 'sent'
    and sent_at >= clock_timestamp() - interval '1 hour';
$$;

-- =============================================================================
-- GRANTS
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public
  to authenticated;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public
  to authenticated, service_role;

-- Configurações dos robôs usam exclusão lógica; DELETE físico fica bloqueado.
revoke delete on table public.prospecta_bot_configs
  from authenticated;
revoke delete on table public.prospecta_whatsapp_sessions
  from authenticated;
revoke delete on table public.prospecta_message_bot_configs
  from authenticated;

-- SECURITY DEFINER não deve herdar o EXECUTE implícito concedido a PUBLIC.
do $$
declare
  routine_item record;
begin
  for routine_item in
    select procedure_oid::regprocedure as signature
    from (
      select pg_proc.oid as procedure_oid
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
      where pg_namespace.nspname = 'public'
        and pg_proc.prosecdef
    ) security_definer_routines
  loop
    execute format(
      'revoke all on function %s from public, anon',
      routine_item.signature
    );
  end loop;
end $$;

grant execute on function public.has_role(uuid, public.app_role)
  to authenticated, service_role;
grant execute on function public.is_leader(uuid)
  to authenticated, service_role;
grant execute on function public.is_leader_or_manager(uuid)
  to authenticated, service_role;
grant execute on function public.is_commercial(uuid)
  to authenticated, service_role;
grant execute on function public.prospecta_is_admin(uuid)
  to authenticated, service_role;
grant execute on function public.prospecta_can_access_bot(uuid)
  to authenticated, service_role;
grant execute on function public.prospecta_claim_checkpoint(
  uuid, text, text, integer
) to service_role;
grant execute on function public.prospecta_save_checkpoint(
  uuid, text, text, jsonb, text, bigint, integer
) to service_role;
grant execute on function public.prospecta_release_checkpoint(
  uuid, text, text, text, bigint
) to service_role;
grant execute on function public.prospecta_get_bot_runtime(uuid)
  to authenticated, service_role;
grant execute on function public.prospecta_list_bot_runtimes()
  to authenticated, service_role;
grant execute on function public.prospecta_get_bot_events(uuid, integer)
  to authenticated, service_role;
grant execute on function public.prospecta_get_recent_bot_events(integer)
  to authenticated, service_role;
grant execute on function public.prospecta_list_runners()
  to authenticated, service_role;
grant execute on function public.prospecta_request_command(uuid, text, text)
  to authenticated, service_role;
grant execute on function public.prospecta_delete_bot(uuid, bigint)
  to authenticated, service_role;
grant execute on function public.prospecta_can_access_message_bot(uuid)
  to authenticated, service_role;
grant execute on function public.prospecta_list_message_bot_runtimes()
  to authenticated, service_role;
grant execute on function public.prospecta_list_message_niches(uuid)
  to authenticated, service_role;
grant execute on function public.prospecta_request_message_bot_command(
  uuid, text, text
) to authenticated, service_role;
grant execute on function public.prospecta_claim_message_lead(
  uuid, text, integer
) to service_role;
grant execute on function public.prospecta_finalize_message_delivery(
  bigint, uuid, text, text
) to service_role;
grant execute on function public.prospecta_message_sent_last_hour(uuid)
  to service_role;

-- =============================================================================
-- STORAGE
-- =============================================================================
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists leadflow_avatars_public_read on storage.objects;
create policy leadflow_avatars_public_read
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists leadflow_avatars_insert_own on storage.objects;
create policy leadflow_avatars_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists leadflow_avatars_update_own on storage.objects;
create policy leadflow_avatars_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists leadflow_avatars_delete_own on storage.objects;
create policy leadflow_avatars_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================================================
-- REALTIME
-- =============================================================================
alter table public.notifications replica identity full;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tasks', 'kanban_columns', 'clients', 'comments', 'time_entries',
    'notifications', 'leads', 'lead_stages', 'lead_activities',
    'sales_events', 'team_clients', 'team_members',
    'client_collaborators', 'client_services', 'finance_settings',
    'cash_adjustments', 'expenses', 'extra_services',
    'prospecta_bot_configs', 'prospecta_bot_checkpoints',
    'prospecta_bot_controls', 'prospecta_bot_runners',
    'prospecta_bot_events', 'prospecta_whatsapp_sessions',
    'prospecta_message_bot_configs', 'prospecta_message_bot_controls',
    'prospecta_message_bot_runtime', 'prospecta_message_deliveries'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end $$;

-- =============================================================================
-- USUARIO LEADER INICIAL
-- =============================================================================
do $$
declare
  config record;
  leader_id uuid;
begin
  select
    btrim(leader_name) as leader_name,
    lower(btrim(leader_email)) as leader_email,
    leader_password,
    nullif(btrim(leader_position), '') as leader_position,
    nullif(btrim(leader_phone), '') as leader_phone
  into config
  from _leadflow_config
  limit 1;

  if config.leader_name is null or config.leader_name = '' then
    raise exception 'CONFIGURACAO: leader_name é obrigatório';
  end if;
  if config.leader_email is null
     or config.leader_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  then
    raise exception 'CONFIGURACAO: leader_email inválido';
  end if;
  if length(config.leader_password) < 12 then
    raise exception 'CONFIGURACAO: a senha deve ter pelo menos 12 caracteres';
  end if;
  if config.leader_password = 'Troque-Esta-Senha-Forte-2026!' then
    raise exception
      'CONFIGURACAO: troque a senha de exemplo antes de executar';
  end if;

  select id
  into leader_id
  from auth.users
  where lower(email) = config.leader_email
  limit 1;

  if leader_id is null then
    leader_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      leader_id,
      'authenticated',
      'authenticated',
      config.leader_email,
      crypt(config.leader_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email')
      ),
      jsonb_build_object('name', config.leader_name),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      leader_id::text,
      leader_id,
      jsonb_build_object(
        'sub', leader_id::text,
        'email', config.leader_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    )
    on conflict (provider_id, provider) do nothing;
  end if;

  insert into public.profiles (
    id,
    name,
    email,
    position,
    phone,
    is_active
  )
  values (
    leader_id,
    config.leader_name,
    config.leader_email,
    config.leader_position,
    config.leader_phone,
    true
  )
  on conflict (id) do update
  set name = excluded.name,
      email = excluded.email,
      position = excluded.position,
      phone = excluded.phone,
      is_active = true,
      updated_at = now();

  insert into public.user_roles (user_id, role)
  values (leader_id, 'leader')
  on conflict (user_id) do update
  set role = 'leader';

  raise notice 'Leader criado/configurado: % (%)',
    config.leader_name,
    config.leader_email;
end;
$$;

-- Recarrega o cache de schema da API.
notify pgrst, 'reload schema';

-- =============================================================================
-- VALIDACAO FINAL - O RESULTADO DEVE MOSTRAR "ok" EM TODAS AS LINHAS
-- =============================================================================
select 'leader' as item,
  case when exists (
    select 1
    from public.user_roles role_row
    join public.profiles profile on profile.id = role_row.user_id
    join _leadflow_config config
      on lower(profile.email) = lower(config.leader_email)
    where role_row.role = 'leader'
  ) then 'ok' else 'erro' end as resultado
union all
select 'tabelas_publicas',
  case when (
    select count(*)
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
  ) >= 43 then 'ok' else 'erro' end
union all
select 'bucket_avatars',
  case when exists (
    select 1 from storage.buckets where id = 'avatars'
  ) then 'ok' else 'erro' end
union all
select 'rpc_prospeccao',
  case when to_regprocedure(
    'public.prospecta_list_bot_runtimes()'
  ) is not null then 'ok' else 'erro' end
union all
select 'rpc_whatsapp',
  case when to_regprocedure(
    'public.prospecta_list_message_bot_runtimes()'
  ) is not null then 'ok' else 'erro' end
union all
select 'rpc_checkpoint_runner',
  case when to_regprocedure(
    'public.prospecta_claim_checkpoint(uuid,text,text,integer)'
  ) is not null then 'ok' else 'erro' end
union all
select 'rpc_entrega_whatsapp',
  case when to_regprocedure(
    'public.prospecta_claim_message_lead(uuid,text,integer)'
  ) is not null
  and to_regprocedure(
    'public.prospecta_finalize_message_delivery(bigint,uuid,text,text)'
  ) is not null then 'ok' else 'erro' end;

drop table if exists _leadflow_config;
