-- Prospecta Flow - limite de leads por agente de prospecção.
-- max_leads nulo = sem limite. O total gerado por agente é a soma dos leads
-- inseridos nos lotes do agente (prospecta_lead_import_batches), então o
-- limite vale para todo o histórico do agente e pode ser aumentado na edição.
-- A trava fica na função de gravação para valer também em apps desatualizados.

begin;

alter table public.prospecta_bot_configs
  add column if not exists max_leads integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'prospecta_bot_configs_max_leads_valid'
  ) then
    alter table public.prospecta_bot_configs
      add constraint prospecta_bot_configs_max_leads_valid
      check (max_leads is null or max_leads between 1 and 100000);
  end if;
end;
$$;

create index if not exists prospecta_lead_import_batches_bot_idx
  on public.prospecta_lead_import_batches (tenant_id, bot_id);

-- Total de leads já gerados por agente da empresa do usuário.
create or replace function public.prospecta_get_bot_lead_counts()
returns table (bot_id uuid, generated_leads bigint)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    batch.bot_id,
    coalesce(sum((batch.result ->> 'inserted')::integer), 0)::bigint
  from public.prospecta_lead_import_batches batch
  join public.prospecta_bot_configs config
    on config.id = batch.bot_id
   and config.tenant_id = batch.tenant_id
   and config.deleted_at is null
  where public.is_tenant_member(config.tenant_id)
  group by batch.bot_id;
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
  quota_remaining integer;
  bot_generated integer := 0;
  bot_remaining integer;
  result_value jsonb;
  unlimited_value boolean;
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

  unlimited_value := public.prospecta_user_has_unlimited_leads();
  usage_row := public.prospecta_ensure_usage_period(config_row.tenant_id);

  select * into subscription_row
  from public.tenant_subscriptions
  where tenant_id = config_row.tenant_id;

  if subscription_row.status not in ('active', 'trialing') then
    raise exception 'Assinatura sem permissão para gerar leads';
  end if;

  -- A trava do período serializa os lotes da empresa, inclusive a contagem
  -- por agente feita abaixo.
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

  quota_remaining := case
    when unlimited_value then requested_count
    else greatest(usage_row.leads_limit - usage_row.leads_used, 0)
  end;

  if config_row.max_leads is not null then
    select coalesce(sum((batch.result ->> 'inserted')::integer), 0)
    into bot_generated
    from public.prospecta_lead_import_batches batch
    where batch.tenant_id = config_row.tenant_id
      and batch.bot_id = p_bot_id;
    bot_remaining := greatest(config_row.max_leads - bot_generated, 0);
  end if;

  remaining_before := least(
    quota_remaining,
    coalesce(bot_remaining, quota_remaining)
  );

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
    if not unlimited_value then
      update public.tenant_usage_periods
      set leads_used = leads_used + inserted_count
      where id = usage_row.id;
    end if;

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
      jsonb_build_object(
        'bot_id', p_bot_id,
        'quota_exempt', unlimited_value
      )
    );
  end if;

  -- limit_reached continua indicando somente a cota mensal do plano;
  -- bot_limit_reached indica o limite configurado no agente.
  result_value := jsonb_build_object(
    'requested', requested_count,
    'inserted', inserted_count,
    'inserted_leads', inserted_leads,
    'processed_leads', processed_leads,
    'remaining', case
      when unlimited_value then 2147483647
      else greatest(quota_remaining - inserted_count, 0)
    end,
    'limit_reached', case
      when unlimited_value then false
      else quota_remaining <= inserted_count
    end,
    'bot_max_leads', config_row.max_leads,
    'bot_generated', bot_generated + inserted_count,
    'bot_limit_reached', coalesce(bot_remaining <= inserted_count, false),
    'plan_code', subscription_row.plan_code,
    'period_end', subscription_row.current_period_end,
    'is_unlimited', unlimited_value
  );

  insert into public.prospecta_lead_import_batches (
    tenant_id,
    batch_key,
    bot_id,
    result
  )
  values (
    config_row.tenant_id,
    p_batch_key,
    p_bot_id,
    result_value
  );

  return result_value;
end;
$$;

revoke all on function public.prospecta_get_bot_lead_counts()
  from public, anon;
grant execute on function public.prospecta_get_bot_lead_counts()
  to authenticated;

revoke all on function public.prospecta_insert_leads_with_quota(
  uuid, jsonb, text
) from public, anon;
grant execute on function public.prospecta_insert_leads_with_quota(
  uuid, jsonb, text
) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
