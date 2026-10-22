-- Prospecta Flow - Remoção da integração oficial Meta WhatsApp Cloud API.
-- Os agentes de WhatsApp passam a usar exclusivamente o WhatsApp Web local.
-- Pode ser executado no SQL Editor do Supabase; é transacional e idempotente.
-- ATENÇÃO: as credenciais Meta salvas são apagadas definitivamente.

begin;

do $$
begin
  if to_regclass('public.prospecta_whatsapp_sessions') is null
     or to_regclass('public.prospecta_message_bot_configs') is null
     or to_regclass('public.prospecta_message_deliveries') is null then
    raise exception
      'Estrutura dos agentes de WhatsApp não encontrada. Aplique primeiro o SQL base do SaaS.';
  end if;
end;
$$;

-- Permissão de uso dos agentes de WhatsApp (independente da Meta).
alter table public.prospecta_whatsapp_sessions
  add column if not exists provider text not null default 'whatsapp_web';

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

-- Triggers de provider saem antes da conversão (o SQL Editor não tem auth.uid).
drop trigger if exists zz_whatsapp_sessions_validate_provider
  on public.prospecta_whatsapp_sessions;
drop trigger if exists zz_message_bot_configs_validate_provider
  on public.prospecta_message_bot_configs;
drop trigger if exists zz_message_bot_controls_validate_provider
  on public.prospecta_message_bot_controls;

-- Para os agentes que estavam na Meta e converte as conexões para WhatsApp Web.
update public.prospecta_message_bot_controls control
set command = 'parado',
    requested_at = clock_timestamp(),
    acknowledged_at = null
from public.prospecta_message_bot_configs config
join public.prospecta_whatsapp_sessions session
  on session.id = config.whatsapp_session_id
where control.bot_id = config.id
  and session.provider = 'meta_cloud_api'
  and control.command <> 'parado';

update public.prospecta_whatsapp_sessions
set provider = 'whatsapp_web',
    status = 'disconnected',
    runner_id = null,
    connected_number = null,
    qr_code_data_url = null,
    qr_generated_at = null,
    last_error = null
where provider = 'meta_cloud_api';

-- Remove objetos exclusivos da Meta.
drop table if exists public.prospecta_whatsapp_cloud_credentials cascade;

drop function if exists public.prospecta_stop_removed_meta_credential();
drop function if exists public.prospecta_finalize_meta_message_delivery(
  bigint, uuid, text, text, text, text
);
drop function if exists public.prospecta_apply_meta_delivery_status(
  text, text, text, timestamptz, text
);

drop index if exists public.prospecta_message_deliveries_meta_message_uidx;

alter table public.prospecta_message_deliveries
  drop constraint if exists prospecta_message_deliveries_meta_status_valid,
  drop column if exists meta_message_id,
  drop column if exists meta_delivery_status,
  drop column if exists meta_status_updated_at;

alter table public.prospecta_message_bot_configs
  drop constraint if exists prospecta_message_bots_meta_parameters_array,
  drop column if exists meta_template_name,
  drop column if exists meta_template_language,
  drop column if exists meta_template_parameters;

alter table public.prospecta_whatsapp_sessions
  drop constraint if exists prospecta_whatsapp_sessions_provider_valid;
alter table public.prospecta_whatsapp_sessions
  add constraint prospecta_whatsapp_sessions_provider_valid
  check (provider = 'whatsapp_web');

-- Validações recriadas somente para o WhatsApp Web.
create or replace function public.prospecta_validate_whatsapp_provider()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.prospecta_can_use_message_bots() then
    raise exception
      'Agentes de WhatsApp estão disponíveis somente para o usuário autorizado';
  end if;
  return new;
end;
$$;

create trigger zz_whatsapp_sessions_validate_provider
before insert or update on public.prospecta_whatsapp_sessions
for each row execute function public.prospecta_validate_whatsapp_provider();

create or replace function public.prospecta_validate_message_bot_provider()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.prospecta_can_use_message_bots() then
    raise exception
      'Agentes de WhatsApp estão disponíveis somente para o usuário autorizado';
  end if;

  if not exists (
    select 1
    from public.prospecta_whatsapp_sessions session
    where session.id = new.whatsapp_session_id
      and session.tenant_id = new.tenant_id
      and session.deleted_at is null
  ) then
    raise exception 'Sessão WhatsApp não encontrada para esta empresa';
  end if;

  return new;
end;
$$;

create trigger zz_message_bot_configs_validate_provider
before insert or update on public.prospecta_message_bot_configs
for each row execute function public.prospecta_validate_message_bot_provider();

create or replace function public.prospecta_validate_message_control_provider()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.prospecta_can_use_message_bots() then
    raise exception
      'Agentes de WhatsApp estão disponíveis somente para o usuário autorizado';
  end if;

  if new.command <> 'rodando' then
    return new;
  end if;

  if not exists (
    select 1
    from public.prospecta_message_bot_configs config
    join public.prospecta_whatsapp_sessions session
      on session.id = config.whatsapp_session_id
     and session.tenant_id = config.tenant_id
    where config.id = new.bot_id
      and config.deleted_at is null
      and session.deleted_at is null
  ) then
    raise exception 'Agente ou sessão WhatsApp não encontrado';
  end if;

  return new;
end;
$$;

create trigger zz_message_bot_controls_validate_provider
before insert or update on public.prospecta_message_bot_controls
for each row execute function public.prospecta_validate_message_control_provider();

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
      'deleted_at', session.deleted_at
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
        and config.tenant_id = public.current_tenant_id()
        and public.is_tenant_member(config.tenant_id)
      )
    )
  order by config.name;
$$;

alter table public.prospecta_whatsapp_unofficial_users
  enable row level security;
revoke all on table public.prospecta_whatsapp_unofficial_users
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.prospecta_whatsapp_unofficial_users to service_role;

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
revoke all on function public.prospecta_list_message_bot_runtimes()
  from public, anon;

grant execute on function public.prospecta_can_use_message_bots()
  to authenticated, service_role;
grant execute on function public.prospecta_can_use_unofficial_whatsapp()
  to authenticated, service_role;
grant execute on function public.prospecta_list_message_bot_runtimes()
  to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
