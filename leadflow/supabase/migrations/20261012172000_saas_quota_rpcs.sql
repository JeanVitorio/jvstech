begin;

with ranked as (
  select
    lead.id,
    encode(
      digest(
        lower(regexp_replace(btrim(lead.name), '[^[:alnum:]]+', ' ', 'g'))
        || '|' || coalesce(btrim(lead.phone), ''),
        'sha256'
      ),
      'hex'
    ) as generated_key,
    row_number() over (
      partition by
        lead.tenant_id,
        lower(regexp_replace(btrim(lead.name), '[^[:alnum:]]+', ' ', 'g')),
        coalesce(btrim(lead.phone), '')
      order by lead.created_at, lead.id
    ) as duplicate_position
  from public.leads lead
  where lead.tenant_id is not null
)
update public.leads lead
set dedupe_key = ranked.generated_key
from ranked
where lead.id = ranked.id
  and ranked.duplicate_position = 1
  and lead.dedupe_key is null;

create unique index if not exists leads_tenant_dedupe_uidx
  on public.leads (tenant_id, dedupe_key)
  where dedupe_key is not null;

create or replace function public.prospecta_ensure_usage_period(
  p_tenant_id uuid
)
returns public.tenant_usage_periods
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  subscription_row public.tenant_subscriptions;
  plan_row public.subscription_plans;
  usage_row public.tenant_usage_periods;
  period_start timestamptz;
  period_end timestamptz;
begin
  select * into subscription_row
  from public.tenant_subscriptions
  where tenant_id = p_tenant_id
  for update;

  if not found then
    period_start := date_trunc('day', clock_timestamp());
    period_end := period_start + interval '1 month';
    insert into public.tenant_subscriptions (
      tenant_id,
      plan_code,
      status,
      current_period_start,
      current_period_end
    )
    values (
      p_tenant_id, 'free', 'active', period_start, period_end
    )
    returning * into subscription_row;
  end if;

  if subscription_row.plan_code = 'free'
     and subscription_row.current_period_end <= clock_timestamp() then
    period_start := date_trunc('day', clock_timestamp());
    period_end := period_start + interval '1 month';
    update public.tenant_subscriptions
    set current_period_start = period_start,
        current_period_end = period_end,
        status = 'active',
        canceled_at = null
    where tenant_id = p_tenant_id
    returning * into subscription_row;
  end if;

  select * into plan_row
  from public.subscription_plans
  where code = subscription_row.plan_code
    and active;

  if not found then
    raise exception 'Plano da assinatura não está disponível';
  end if;

  insert into public.tenant_usage_periods (
    tenant_id,
    period_start,
    period_end,
    leads_limit
  )
  values (
    p_tenant_id,
    subscription_row.current_period_start,
    subscription_row.current_period_end,
    plan_row.leads_per_month
  )
  on conflict (tenant_id, period_start, period_end) do update
  set leads_limit = excluded.leads_limit
  returning * into usage_row;

  return usage_row;
end;
$$;

create or replace function public.prospecta_get_billing_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  tenant_id_value uuid;
  subscription_row public.tenant_subscriptions;
  usage_row public.tenant_usage_periods;
  plan_row public.subscription_plans;
begin
  tenant_id_value := public.current_tenant_id();
  if tenant_id_value is null then
    return null;
  end if;

  select * into subscription_row
  from public.tenant_subscriptions
  where tenant_id = tenant_id_value;

  select * into plan_row
  from public.subscription_plans
  where code = subscription_row.plan_code;

  select * into usage_row
  from public.tenant_usage_periods
  where tenant_id = tenant_id_value
    and clock_timestamp() >= period_start
    and clock_timestamp() < period_end
  order by period_start desc
  limit 1;

  return jsonb_build_object(
    'tenant_id', tenant_id_value,
    'plan_code', subscription_row.plan_code,
    'plan_name', plan_row.name,
    'status', subscription_row.status,
    'monthly_price_cents', plan_row.monthly_price_cents,
    'leads_limit', coalesce(usage_row.leads_limit, plan_row.leads_per_month),
    'leads_used', coalesce(usage_row.leads_used, 0),
    'leads_remaining', greatest(
      coalesce(usage_row.leads_limit, plan_row.leads_per_month)
        - coalesce(usage_row.leads_used, 0),
      0
    ),
    'current_period_start', subscription_row.current_period_start,
    'current_period_end', subscription_row.current_period_end,
    'cancel_at_period_end', subscription_row.cancel_at_period_end
  );
end;
$$;

create or replace function public.prospecta_insert_leads_with_quota(
  p_bot_id uuid,
  p_leads jsonb,
  p_batch_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  config_row public.prospecta_bot_configs;
  subscription_row public.tenant_subscriptions;
  usage_row public.tenant_usage_periods;
  prior_result jsonb;
  requested_count integer;
  inserted_count integer := 0;
  inserted_leads jsonb := '[]'::jsonb;
  processed_leads jsonb := '[]'::jsonb;
  remaining_before integer;
  result_value jsonb;
begin
  if jsonb_typeof(p_leads) <> 'array' then
    raise exception 'O lote de leads deve ser uma lista JSON';
  end if;
  if btrim(coalesce(p_batch_key, '')) = '' then
    raise exception 'A chave idempotente do lote é obrigatória';
  end if;

  requested_count := jsonb_array_length(p_leads);
  if requested_count < 1 or requested_count > 100 then
    raise exception 'O lote deve conter entre 1 e 100 leads';
  end if;

  select * into config_row
  from public.prospecta_bot_configs
  where id = p_bot_id
    and deleted_at is null;

  if not found or config_row.tenant_id is null then
    raise exception 'Bot não encontrado ou sem empresa vinculada';
  end if;

  if auth.uid() is not null
     and not public.is_tenant_member(config_row.tenant_id) then
    raise exception 'Acesso negado ao bot';
  end if;

  usage_row :=
    public.prospecta_ensure_usage_period(config_row.tenant_id);

  select * into subscription_row
  from public.tenant_subscriptions
  where tenant_id = config_row.tenant_id;

  if subscription_row.status not in ('active', 'trialing') then
    raise exception 'Assinatura sem permissão para gerar leads';
  end if;

  select * into usage_row
  from public.tenant_usage_periods
  where id = usage_row.id
  for update;

  select batch.result into prior_result
  from public.prospecta_lead_import_batches batch
  where batch.tenant_id = config_row.tenant_id
    and batch.batch_key = p_batch_key;
  if found then
    return prior_result;
  end if;

  remaining_before :=
    greatest(usage_row.leads_limit - usage_row.leads_used, 0);

  if remaining_before > 0 then
    with incoming as (
      select lead_data, ordinal
      from jsonb_array_elements(p_leads)
        with ordinality as item(lead_data, ordinal)
      where btrim(coalesce(lead_data ->> 'name', '')) <> ''
      order by ordinal
    ),
    normalized as (
      select
        lead_data,
        ordinal,
        encode(
          digest(
            lower(regexp_replace(
              btrim(lead_data ->> 'name'),
              '[^[:alnum:]]+',
              ' ',
              'g'
            ))
            || '|' || coalesce(btrim(lead_data ->> 'phone'), ''),
            'sha256'
          ),
          'hex'
        ) as generated_key
      from incoming
    ),
    candidates as (
      select normalized.*
      from normalized
      where not exists (
        select 1
        from public.leads existing
        where existing.tenant_id = config_row.tenant_id
          and existing.dedupe_key = normalized.generated_key
      )
      order by ordinal
      limit remaining_before
    ),
    processed as (
      select normalized.*
      from normalized
      where exists (
        select 1
        from public.leads existing
        where existing.tenant_id = config_row.tenant_id
          and existing.dedupe_key = normalized.generated_key
      )
      or exists (
        select 1
        from candidates candidate
        where candidate.generated_key = normalized.generated_key
      )
    ),
    inserted as (
      insert into public.leads (
        tenant_id,
        name,
        company,
        email,
        phone,
        city,
        website,
        instagram,
        source,
        estimated_value,
        niche,
        first_contact_message,
        owner_id,
        google_maps_url,
        stage_id,
        dedupe_key
      )
      select
        config_row.tenant_id,
        btrim(lead_data ->> 'name'),
        nullif(btrim(lead_data ->> 'company'), ''),
        nullif(btrim(lead_data ->> 'email'), ''),
        nullif(btrim(lead_data ->> 'phone'), ''),
        nullif(btrim(lead_data ->> 'city'), ''),
        nullif(btrim(lead_data ->> 'website'), ''),
        nullif(btrim(lead_data ->> 'instagram'), ''),
        coalesce(
          nullif(btrim(lead_data ->> 'source'), ''),
          config_row.niche
        ),
        coalesce((lead_data ->> 'estimated_value')::numeric, 0),
        coalesce(
          nullif(btrim(lead_data ->> 'niche'), ''),
          config_row.niche
        ),
        coalesce(
          nullif(btrim(lead_data ->> 'first_contact_message'), ''),
          config_row.initial_message
        ),
        case
          when public.is_tenant_member(
            config_row.tenant_id,
            config_row.lead_owner_id
          ) then config_row.lead_owner_id
          else null
        end,
        nullif(btrim(lead_data ->> 'google_maps_url'), ''),
        (
          select stage.id
          from public.lead_stages stage
          where stage.tenant_id = config_row.tenant_id
            and stage.id = case
              when coalesce(lead_data ->> 'stage_id', '')
                ~ '^[0-9a-fA-F-]{36}$'
              then (lead_data ->> 'stage_id')::uuid
              else null
            end
          limit 1
        ),
        generated_key
      from candidates
      on conflict (tenant_id, dedupe_key)
        where dedupe_key is not null
      do nothing
      returning name, phone
    )
    select
      count(*),
      coalesce(
        jsonb_agg(jsonb_build_object('name', name, 'phone', phone)),
        '[]'::jsonb
      ),
      coalesce(
        (
          select jsonb_agg(jsonb_build_object(
            'name', lead_data ->> 'name',
            'phone', lead_data ->> 'phone'
          ))
          from processed
        ),
        '[]'::jsonb
      )
    into inserted_count, inserted_leads, processed_leads
    from inserted;
  end if;

  if inserted_count > 0 then
    update public.tenant_usage_periods
    set leads_used = leads_used + inserted_count
    where id = usage_row.id;

    insert into public.tenant_usage_ledger (
      tenant_id,
      usage_period_id,
      event_type,
      quantity,
      idempotency_key,
      metadata
    )
    values (
      config_row.tenant_id,
      usage_row.id,
      'lead_import',
      inserted_count,
      'lead-import:' || config_row.tenant_id || ':' || p_batch_key,
      jsonb_build_object('bot_id', p_bot_id)
    );
  end if;

  result_value := jsonb_build_object(
    'requested', requested_count,
    'inserted', inserted_count,
    'inserted_leads', inserted_leads,
    'processed_leads', processed_leads,
    'remaining', greatest(
      remaining_before - inserted_count,
      0
    ),
    'limit_reached', remaining_before <= inserted_count,
    'plan_code', subscription_row.plan_code,
    'period_end', subscription_row.current_period_end
  );

  insert into public.prospecta_lead_import_batches (
    tenant_id, batch_key, bot_id, result
  )
  values (
    config_row.tenant_id, p_batch_key, p_bot_id, result_value
  );

  return result_value;
end;
$$;

create or replace function public.prospecta_can_access_bot(p_bot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.prospecta_bot_configs config
    where config.id = p_bot_id
      and config.deleted_at is null
      and (
        auth.uid() is null
        or public.is_tenant_member(config.tenant_id)
      )
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
declare
  tenant_id_value uuid;
begin
  if btrim(coalesce(p_process_name, '')) = ''
     or btrim(coalesce(p_runner_id, '')) = '' then
    raise exception 'Processo e executor são obrigatórios';
  end if;
  if p_lease_seconds < 1 or p_lease_seconds > 86400 then
    raise exception 'Duração do lease inválida';
  end if;
  if not public.prospecta_can_access_bot(p_bot_id) then
    raise exception 'Acesso negado ao bot';
  end if;

  select tenant_id into tenant_id_value
  from public.prospecta_bot_configs
  where id = p_bot_id and deleted_at is null;

  return query
  insert into public.prospecta_bot_checkpoints (
    bot_id,
    tenant_id,
    process_name,
    status,
    runner_id,
    lease_expires_at
  )
  values (
    p_bot_id,
    tenant_id_value,
    p_process_name,
    'running',
    p_runner_id,
    clock_timestamp() + make_interval(secs => p_lease_seconds)
  )
  on conflict (bot_id, process_name) do update
  set tenant_id = excluded.tenant_id,
      status = 'running',
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
  if not public.prospecta_can_access_bot(p_bot_id) then
    raise exception 'Acesso negado ao bot';
  end if;
  if jsonb_typeof(coalesce(p_state, '{}'::jsonb)) <> 'object' then
    raise exception 'Estado do checkpoint deve ser um objeto';
  end if;

  return query
  update public.prospecta_bot_checkpoints
  set state = coalesce(p_state, '{}'::jsonb),
      status = p_status,
      lease_expires_at =
        clock_timestamp() + make_interval(secs => p_lease_seconds)
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
  if not public.prospecta_can_access_bot(p_bot_id) then
    raise exception 'Acesso negado ao bot';
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
  where runner.tenant_id = public.current_tenant_id()
    and runner.status = 'online'
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
declare
  tenant_id_value uuid;
  billing_status jsonb;
begin
  if p_command not in ('rodando', 'pausado', 'parado') then
    raise exception 'Comando inválido';
  end if;
  if not public.prospecta_can_access_bot(p_bot_id) then
    raise exception 'Acesso negado ao bot';
  end if;

  select tenant_id into tenant_id_value
  from public.prospecta_bot_configs
  where id = p_bot_id and deleted_at is null;

  if p_command = 'rodando' then
    select jsonb_build_object(
      'status', subscription.status,
      'remaining', greatest(usage.leads_limit - usage.leads_used, 0)
    )
    into billing_status
    from public.tenant_subscriptions subscription
    join lateral (
      select ensured.*
      from public.prospecta_ensure_usage_period(tenant_id_value) ensured
    ) usage on true
    where subscription.tenant_id = tenant_id_value;

    if coalesce(billing_status ->> 'status', '') not in (
      'active', 'trialing'
    ) then
      raise exception 'Assinatura sem permissão para gerar leads';
    end if;
    if coalesce((billing_status ->> 'remaining')::integer, 0) <= 0 then
      raise exception 'Limite mensal de leads atingido';
    end if;
  end if;

  return query
  insert into public.prospecta_bot_controls (
    bot_id,
    tenant_id,
    command,
    target_runner_id,
    request_id,
    requested_at,
    acknowledged_at
  )
  values (
    p_bot_id,
    tenant_id_value,
    p_command,
    nullif(btrim(p_target_runner_id), ''),
    gen_random_uuid(),
    clock_timestamp(),
    null
  )
  on conflict (bot_id) do update
  set tenant_id = excluded.tenant_id,
      command = excluded.command,
      target_runner_id = excluded.target_runner_id,
      request_id = excluded.request_id,
      requested_at = excluded.requested_at,
      acknowledged_at = null
  returning prospecta_bot_controls.*;
end;
$$;

revoke all on function public.prospecta_ensure_usage_period(uuid)
  from public, anon, authenticated;
revoke all on function public.prospecta_insert_leads_with_quota(
  uuid, jsonb, text
) from public, anon;
revoke all on function public.prospecta_get_billing_status()
  from public, anon;
revoke all on function public.prospecta_can_access_bot(uuid)
  from public, anon, authenticated;
revoke all on function public.prospecta_claim_checkpoint(
  uuid, text, text, integer
) from public, anon, authenticated;
revoke all on function public.prospecta_save_checkpoint(
  uuid, text, text, jsonb, text, bigint, integer
) from public, anon, authenticated;
revoke all on function public.prospecta_release_checkpoint(
  uuid, text, text, text, bigint
) from public, anon, authenticated;
revoke all on function public.prospecta_list_runners()
  from public, anon, authenticated;
revoke all on function public.prospecta_request_command(
  uuid, text, text
) from public, anon, authenticated;
grant execute on function public.prospecta_ensure_usage_period(uuid)
  to service_role;
grant execute on function public.prospecta_insert_leads_with_quota(
  uuid, jsonb, text
) to authenticated, service_role;
grant execute on function public.prospecta_get_billing_status()
  to authenticated;
grant execute on function public.prospecta_claim_checkpoint(
  uuid, text, text, integer
) to authenticated, service_role;
grant execute on function public.prospecta_save_checkpoint(
  uuid, text, text, jsonb, text, bigint, integer
) to authenticated, service_role;
grant execute on function public.prospecta_release_checkpoint(
  uuid, text, text, text, bigint
) to authenticated, service_role;
grant execute on function public.prospecta_can_access_bot(uuid)
  to authenticated, service_role;
grant execute on function public.prospecta_list_runners()
  to authenticated, service_role;
grant execute on function public.prospecta_request_command(
  uuid, text, text
) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
