-- Prospecta Flow - Meta WhatsApp Cloud API
-- Execute integralmente no SQL Editor do Supabase.
-- O script é transacional, idempotente e não armazena segredos em objetos públicos.

begin;

do $$
begin
  if to_regclass('public.prospecta_whatsapp_sessions') is null
     or to_regclass('public.prospecta_message_bot_configs') is null
     or to_regclass('public.prospecta_message_deliveries') is null then
    raise exception
      'Estrutura de bots WhatsApp não encontrada. Aplique primeiro o SQL base do SaaS.';
  end if;

  if not exists (
    select 1
    from auth.users
    where lower(email) = 'jeanadmin@jvs.com.br'
  ) then
    raise exception
      'Usuário obrigatório jeanadmin@jvs.com.br não encontrado em auth.users.';
  end if;
end;
$$;

alter table public.prospecta_whatsapp_sessions
  add column if not exists provider text not null default 'whatsapp_web';

alter table public.prospecta_message_bot_configs
  add column if not exists meta_template_name text,
  add column if not exists meta_template_language text,
  add column if not exists meta_template_parameters jsonb not null default '[]'::jsonb;

alter table public.prospecta_message_deliveries
  add column if not exists meta_message_id text,
  add column if not exists meta_delivery_status text,
  add column if not exists meta_status_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'prospecta_whatsapp_sessions_provider_valid'
      and conrelid = 'public.prospecta_whatsapp_sessions'::regclass
  ) then
    alter table public.prospecta_whatsapp_sessions
      add constraint prospecta_whatsapp_sessions_provider_valid
      check (provider in ('whatsapp_web', 'meta_cloud_api'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'prospecta_message_bots_meta_parameters_array'
      and conrelid = 'public.prospecta_message_bot_configs'::regclass
  ) then
    alter table public.prospecta_message_bot_configs
      add constraint prospecta_message_bots_meta_parameters_array
      check (jsonb_typeof(meta_template_parameters) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'prospecta_message_deliveries_meta_status_valid'
      and conrelid = 'public.prospecta_message_deliveries'::regclass
  ) then
    alter table public.prospecta_message_deliveries
      add constraint prospecta_message_deliveries_meta_status_valid
      check (
        meta_delivery_status is null
        or meta_delivery_status in (
          'accepted', 'sent', 'delivered', 'read', 'failed', 'deleted'
        )
      );
  end if;
end;
$$;

create unique index if not exists
  prospecta_message_deliveries_meta_message_uidx
  on public.prospecta_message_deliveries (meta_message_id)
  where meta_message_id is not null;

create table if not exists public.prospecta_whatsapp_cloud_credentials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  whatsapp_session_id uuid not null
    references public.prospecta_whatsapp_sessions(id) on delete cascade,
  waba_id text not null,
  phone_number_id text not null,
  display_phone_number text,
  verified_name text,
  quality_rating text,
  code_verification_status text,
  api_version text not null default 'v26.0',
  token_ciphertext text not null,
  token_iv text not null,
  app_secret_ciphertext text,
  app_secret_iv text,
  status text not null default 'active',
  last_verified_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospecta_whatsapp_cloud_credentials_session_unique
    unique (tenant_id, whatsapp_session_id),
  constraint prospecta_whatsapp_cloud_credentials_phone_unique
    unique (phone_number_id),
  constraint prospecta_whatsapp_cloud_credentials_status_valid
    check (status in ('active', 'invalid', 'revoked')),
  constraint prospecta_whatsapp_cloud_credentials_api_version_valid
    check (api_version ~ '^v[0-9]{1,2}\.[0-9]{1,2}$'),
  constraint prospecta_whatsapp_cloud_credentials_values_not_blank
    check (
      btrim(waba_id) <> ''
      and btrim(phone_number_id) <> ''
      and btrim(token_ciphertext) <> ''
      and btrim(token_iv) <> ''
    ),
  constraint prospecta_whatsapp_cloud_credentials_secret_pair
    check (
      (app_secret_ciphertext is null and app_secret_iv is null)
      or (
        btrim(coalesce(app_secret_ciphertext, '')) <> ''
        and btrim(coalesce(app_secret_iv, '')) <> ''
      )
    )
);

create index if not exists prospecta_whatsapp_cloud_credentials_tenant_idx
  on public.prospecta_whatsapp_cloud_credentials (tenant_id);

create table if not exists public.prospecta_whatsapp_unofficial_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.prospecta_whatsapp_unofficial_users (user_id)
select id
from auth.users
where lower(email) = 'jeanadmin@jvs.com.br'
on conflict (user_id) do nothing;

create or replace function public.prospecta_can_use_message_bots()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.role() = 'service_role'
    or exists (
      select 1
      from public.prospecta_whatsapp_unofficial_users allowed_user
      where allowed_user.user_id = auth.uid()
    );
$$;

create or replace function public.prospecta_can_use_unofficial_whatsapp()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.prospecta_can_use_message_bots();
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
  select auth.role() = 'service_role'
    or (
      public.prospecta_can_use_message_bots()
      and exists (
        select 1
        from public.prospecta_message_bot_configs config
        where config.id = p_bot_id
          and config.deleted_at is null
          and config.tenant_id = public.current_tenant_id()
          and public.is_tenant_member(config.tenant_id)
      )
    );
$$;

create or replace function public.prospecta_validate_whatsapp_provider()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.prospecta_can_use_message_bots() then
    raise exception
      'Bots de mensagens estão disponíveis somente para o usuário autorizado';
  end if;
  return new;
end;
$$;

drop trigger if exists zz_whatsapp_sessions_validate_provider
  on public.prospecta_whatsapp_sessions;
create trigger zz_whatsapp_sessions_validate_provider
before insert or update on public.prospecta_whatsapp_sessions
for each row execute function public.prospecta_validate_whatsapp_provider();

create or replace function public.prospecta_validate_message_bot_provider()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  session_row public.prospecta_whatsapp_sessions%rowtype;
  parameter_value jsonb;
begin
  if not public.prospecta_can_use_message_bots() then
    raise exception
      'Bots de mensagens estão disponíveis somente para o usuário autorizado';
  end if;

  select * into session_row
  from public.prospecta_whatsapp_sessions
  where id = new.whatsapp_session_id
    and tenant_id = new.tenant_id
    and deleted_at is null;

  if not found then
    raise exception 'Sessão WhatsApp não encontrada para esta empresa';
  end if;

  if session_row.provider = 'meta_cloud_api' then
    if btrim(coalesce(new.meta_template_name, '')) = ''
       or btrim(coalesce(new.meta_template_language, '')) = '' then
      raise exception 'Template e idioma Meta são obrigatórios';
    end if;

    if not exists (
      select 1
      from public.prospecta_whatsapp_cloud_credentials credential
      where credential.tenant_id = new.tenant_id
        and credential.whatsapp_session_id = new.whatsapp_session_id
        and credential.status = 'active'
    ) then
      raise exception 'A sessão Meta não possui credencial ativa';
    end if;

    for parameter_value in
      select value
      from jsonb_array_elements(new.meta_template_parameters)
    loop
      if jsonb_typeof(parameter_value) <> 'string'
         or parameter_value #>> '{}' not in ('nome', 'empresa', 'nicho') then
        raise exception
          'Parâmetro Meta inválido; use somente nome, empresa e nicho';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists zz_message_bot_configs_validate_provider
  on public.prospecta_message_bot_configs;
create trigger zz_message_bot_configs_validate_provider
before insert or update on public.prospecta_message_bot_configs
for each row execute function public.prospecta_validate_message_bot_provider();

create or replace function public.prospecta_validate_message_control_provider()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  provider_value text;
  tenant_id_value uuid;
  session_id_value uuid;
  template_name_value text;
  template_language_value text;
begin
  if not public.prospecta_can_use_message_bots() then
    raise exception
      'Bots de mensagens estão disponíveis somente para o usuário autorizado';
  end if;

  if new.command <> 'rodando' then
    return new;
  end if;

  select
    session.provider,
    config.tenant_id,
    session.id,
    config.meta_template_name,
    config.meta_template_language
  into
    provider_value,
    tenant_id_value,
    session_id_value,
    template_name_value,
    template_language_value
  from public.prospecta_message_bot_configs config
  join public.prospecta_whatsapp_sessions session
    on session.id = config.whatsapp_session_id
   and session.tenant_id = config.tenant_id
  where config.id = new.bot_id
    and config.deleted_at is null
    and session.deleted_at is null;

  if not found then
    raise exception 'Bot ou sessão WhatsApp não encontrado';
  end if;

  if provider_value = 'meta_cloud_api'
     and (
       btrim(coalesce(template_name_value, '')) = ''
       or btrim(coalesce(template_language_value, '')) = ''
       or not exists (
         select 1
         from public.prospecta_whatsapp_cloud_credentials credential
         where credential.tenant_id = tenant_id_value
           and credential.whatsapp_session_id = session_id_value
           and credential.status = 'active'
       )
     ) then
    raise exception
      'Bot Meta exige credencial ativa e template configurado';
  end if;

  return new;
end;
$$;

drop trigger if exists zz_message_bot_controls_validate_provider
  on public.prospecta_message_bot_controls;
create trigger zz_message_bot_controls_validate_provider
before insert or update on public.prospecta_message_bot_controls
for each row execute function public.prospecta_validate_message_control_provider();

create or replace function public.prospecta_stop_removed_meta_credential()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE'
     or (tg_op = 'UPDATE' and new.status <> 'active') then
    update public.prospecta_message_bot_controls control
    set command = 'parado',
        requested_at = clock_timestamp(),
        acknowledged_at = null
    from public.prospecta_message_bot_configs config
    where control.bot_id = config.id
      and config.tenant_id = old.tenant_id
      and config.whatsapp_session_id = old.whatsapp_session_id
      and control.command = 'rodando';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists zz_whatsapp_cloud_credentials_stop_bots
  on public.prospecta_whatsapp_cloud_credentials;
create trigger zz_whatsapp_cloud_credentials_stop_bots
before delete or update of status
on public.prospecta_whatsapp_cloud_credentials
for each row execute function public.prospecta_stop_removed_meta_credential();

-- Preserva históricos, mas interrompe controles não autorizados já em execução.
update public.prospecta_message_bot_controls control
set command = 'parado',
    requested_at = clock_timestamp(),
    acknowledged_at = null
from public.prospecta_message_bot_configs config
join public.prospecta_whatsapp_sessions session
  on session.id = config.whatsapp_session_id
 and session.tenant_id = config.tenant_id
where control.bot_id = config.id
  and control.command = 'rodando'
  and not exists (
    select 1
    from public.prospecta_whatsapp_unofficial_users allowed_user
    where allowed_user.user_id = config.created_by
  );

create or replace function public.prospecta_list_message_bot_runtimes()
returns table (runtime jsonb)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'config', jsonb_build_object(
      'id', config.id,
      'slug', config.slug,
      'name', config.name,
      'lead_owner_id', config.lead_owner_id,
      'whatsapp_session_id', config.whatsapp_session_id,
      'niche', config.niche,
      'source_stage_id', config.source_stage_id,
      'target_stage_id', config.target_stage_id,
      'message_template', config.message_template,
      'meta_template_name', config.meta_template_name,
      'meta_template_language', config.meta_template_language,
      'meta_template_parameters', config.meta_template_parameters,
      'min_interval_seconds', config.min_interval_seconds,
      'max_interval_seconds', config.max_interval_seconds,
      'max_messages_per_hour', config.max_messages_per_hour,
      'weekly_schedule', config.weekly_schedule,
      'timezone', config.timezone,
      'version', config.version
    ),
    'session', jsonb_build_object(
      'id', session.id,
      'name', session.name,
      'owner_id', session.owner_id,
      'provider', session.provider,
      'status', session.status,
      'runner_id', session.runner_id,
      'connected_number', session.connected_number,
      'qr_code_data_url', session.qr_code_data_url,
      'qr_generated_at', session.qr_generated_at,
      'last_error', session.last_error,
      'last_seen_at', session.last_seen_at,
      'version', session.version,
      'deleted_at', session.deleted_at,
      'credential_status', credential.status,
      'display_phone_number', credential.display_phone_number,
      'verified_name', credential.verified_name,
      'quality_rating', credential.quality_rating,
      'last_verified_at', credential.last_verified_at
    ),
    'control', case
      when control.bot_id is null then null
      else jsonb_build_object(
        'command', control.command,
        'target_runner_id', control.target_runner_id,
        'request_id', control.request_id,
        'requested_at', control.requested_at,
        'acknowledged_at', control.acknowledged_at
      )
    end,
    'runtime', case
      when bot_runtime.bot_id is null then null
      else to_jsonb(bot_runtime) - 'tenant_id'
    end
  )
  from public.prospecta_message_bot_configs config
  join public.prospecta_whatsapp_sessions session
    on session.id = config.whatsapp_session_id
   and session.tenant_id = config.tenant_id
  left join public.prospecta_whatsapp_cloud_credentials credential
    on credential.whatsapp_session_id = session.id
   and credential.tenant_id = session.tenant_id
  left join public.prospecta_message_bot_controls control
    on control.bot_id = config.id
   and control.tenant_id = config.tenant_id
  left join public.prospecta_message_bot_runtime bot_runtime
    on bot_runtime.bot_id = config.id
   and bot_runtime.tenant_id = config.tenant_id
  where config.deleted_at is null
    and session.deleted_at is null
    and (
      auth.role() = 'service_role'
      or (
        public.prospecta_can_use_message_bots()
        and
        config.tenant_id = public.current_tenant_id()
        and public.is_tenant_member(config.tenant_id)
      )
    )
  order by config.name;
$$;

create or replace function public.prospecta_finalize_meta_message_delivery(
  p_delivery_id bigint,
  p_claim_token uuid,
  p_status text,
  p_error_code text default null,
  p_meta_message_id text default null,
  p_meta_delivery_status text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  finalized boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Apenas o runtime autorizado pode finalizar entrega Meta';
  end if;
  if p_status not in ('sent', 'failed') then
    raise exception 'Status final Meta inválido';
  end if;
  if p_status = 'sent'
     and btrim(coalesce(p_meta_message_id, '')) = '' then
    raise exception 'ID da mensagem Meta é obrigatório';
  end if;

  perform 1
  from public.prospecta_message_deliveries delivery
  join public.prospecta_whatsapp_sessions session
    on session.id = delivery.whatsapp_session_id
   and session.tenant_id = delivery.tenant_id
  where delivery.id = p_delivery_id
    and delivery.claim_token = p_claim_token
    and delivery.status = 'claimed'
    and session.provider = 'meta_cloud_api'
  for update of delivery;

  if not found then
    return false;
  end if;

  update public.prospecta_message_deliveries
  set meta_message_id = case
        when p_status = 'sent' then btrim(p_meta_message_id)
        else meta_message_id
      end,
      meta_delivery_status = coalesce(
        nullif(btrim(p_meta_delivery_status), ''),
        case when p_status = 'sent' then 'accepted' else 'failed' end
      ),
      meta_status_updated_at = clock_timestamp()
  where id = p_delivery_id;

  finalized := public.prospecta_finalize_message_delivery(
    p_delivery_id,
    p_claim_token,
    p_status,
    left(nullif(p_error_code, ''), 200)
  );
  return finalized;
end;
$$;

create or replace function public.prospecta_apply_meta_delivery_status(
  p_phone_number_id text,
  p_meta_message_id text,
  p_meta_delivery_status text,
  p_status_updated_at timestamptz,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  affected_rows integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Apenas o webhook autorizado pode atualizar status Meta';
  end if;
  if p_meta_delivery_status not in ('sent', 'delivered', 'read', 'failed') then
    raise exception 'Status de webhook Meta inválido';
  end if;

  update public.prospecta_message_deliveries delivery
  set meta_delivery_status = p_meta_delivery_status,
      meta_status_updated_at = p_status_updated_at,
      error_code = case
        when p_meta_delivery_status = 'failed'
          then left(nullif(p_error_code, ''), 200)
        else delivery.error_code
      end
  from public.prospecta_whatsapp_cloud_credentials credential
  where credential.phone_number_id = p_phone_number_id
    and credential.status = 'active'
    and delivery.tenant_id = credential.tenant_id
    and delivery.whatsapp_session_id = credential.whatsapp_session_id
    and delivery.meta_message_id = p_meta_message_id
    and (
      delivery.meta_status_updated_at is null
      or delivery.meta_status_updated_at < p_status_updated_at
      or (
        delivery.meta_status_updated_at = p_status_updated_at
        and case delivery.meta_delivery_status
          when 'accepted' then 0
          when 'sent' then 1
          when 'delivered' then 2
          when 'read' then 3
          when 'failed' then 4
          else -1
        end < case p_meta_delivery_status
          when 'sent' then 1
          when 'delivered' then 2
          when 'read' then 3
          when 'failed' then 4
        end
      )
    );

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

alter table public.prospecta_whatsapp_cloud_credentials
  enable row level security;
alter table public.prospecta_whatsapp_unofficial_users
  enable row level security;

revoke all on table public.prospecta_whatsapp_cloud_credentials
  from public, anon, authenticated;
revoke all on table public.prospecta_whatsapp_unofficial_users
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.prospecta_whatsapp_cloud_credentials to service_role;
grant select, insert, update, delete
  on table public.prospecta_whatsapp_unofficial_users to service_role;
grant select, insert, update
  on table public.prospecta_whatsapp_sessions to service_role;
grant select
  on table
    public.prospecta_message_bot_configs,
    public.leads,
    public.tenant_memberships,
    public.profiles
  to service_role;
grant select, update
  on table public.prospecta_message_deliveries to service_role;

revoke all on function public.prospecta_can_use_message_bots()
  from public, anon, authenticated;
revoke all on function public.prospecta_can_use_unofficial_whatsapp()
  from public, anon, authenticated;
revoke all on function public.prospecta_validate_whatsapp_provider()
  from public, anon, authenticated;
revoke all on function public.prospecta_validate_message_bot_provider()
  from public, anon, authenticated;
revoke all on function public.prospecta_validate_message_control_provider()
  from public, anon, authenticated;
revoke all on function public.prospecta_stop_removed_meta_credential()
  from public, anon, authenticated;
revoke all on function public.prospecta_list_message_bot_runtimes()
  from public, anon;
revoke all on function public.prospecta_finalize_meta_message_delivery(
  bigint, uuid, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.prospecta_apply_meta_delivery_status(
  text, text, text, timestamptz, text
) from public, anon, authenticated;

grant execute on function public.prospecta_can_use_message_bots()
  to authenticated, service_role;
grant execute on function public.prospecta_can_use_unofficial_whatsapp()
  to authenticated, service_role;
grant execute on function public.prospecta_list_message_bot_runtimes()
  to authenticated, service_role;
grant execute on function public.prospecta_finalize_meta_message_delivery(
  bigint, uuid, text, text, text, text
) to service_role;
grant execute on function public.prospecta_apply_meta_delivery_status(
  text, text, text, timestamptz, text
) to service_role;

notify pgrst, 'reload schema';

commit;
