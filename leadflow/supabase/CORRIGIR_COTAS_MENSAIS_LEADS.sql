begin;

update public.subscription_plans
set leads_per_month = 50,
    updated_at = clock_timestamp()
where code = 'free';

create or replace function public.prospecta_user_has_unlimited_leads()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from auth.users account
    where account.id = auth.uid()
      and lower(account.email) = 'jeanadmin@jvs.com.br'
  );
$$;

-- Mantém concessões manuais válidas do painel de gestão. Sem Stripe ou
-- concessão vigente, qualquer plano local pago volta corretamente ao Free.
do $$
begin
  if to_regclass('public.tenant_billing_grants') is not null then
    execute $query$
      update public.tenant_subscriptions subscription
      set plan_code = 'free',
          status = 'active',
          current_period_start = date_trunc('month', clock_timestamp()),
          current_period_end =
            date_trunc('month', clock_timestamp()) + interval '1 month',
          cancel_at_period_end = false,
          canceled_at = null
      where subscription.stripe_subscription_id is null
        and not exists (
          select 1
          from public.tenant_billing_grants grant_row
          where grant_row.tenant_id = subscription.tenant_id
            and grant_row.grant_type in (
              'manual_payment',
              'billing_exempt'
            )
            and grant_row.revoked_at is null
            and clock_timestamp() >= grant_row.valid_from
            and clock_timestamp() < grant_row.valid_until
        )
        and (
          subscription.plan_code <> 'free'
          or subscription.status <> 'active'
          or subscription.current_period_start
            <> date_trunc('month', clock_timestamp())
          or subscription.current_period_end
            <> date_trunc('month', clock_timestamp()) + interval '1 month'
        )
    $query$;
  else
    update public.tenant_subscriptions subscription
    set plan_code = 'free',
        status = 'active',
        current_period_start = date_trunc('month', clock_timestamp()),
        current_period_end =
          date_trunc('month', clock_timestamp()) + interval '1 month',
        cancel_at_period_end = false,
        canceled_at = null
    where subscription.stripe_subscription_id is null
      and (
        subscription.plan_code <> 'free'
        or subscription.status <> 'active'
        or subscription.current_period_start
          <> date_trunc('month', clock_timestamp())
        or subscription.current_period_end
          <> date_trunc('month', clock_timestamp()) + interval '1 month'
      );
  end if;
end;
$$;

update public.tenant_subscriptions subscription
set current_period_start = date_trunc('month', clock_timestamp()),
    current_period_end =
      date_trunc('month', clock_timestamp()) + interval '1 month',
    status = 'active',
    cancel_at_period_end = false,
    canceled_at = null
where subscription.plan_code = 'free'
  and (
    subscription.current_period_start
      <> date_trunc('month', clock_timestamp())
    or subscription.current_period_end
      <> date_trunc('month', clock_timestamp()) + interval '1 month'
    or subscription.status <> 'active'
  );

insert into public.tenant_usage_periods (
  tenant_id,
  period_start,
  period_end,
  leads_limit
)
select
  subscription.tenant_id,
  subscription.current_period_start,
  subscription.current_period_end,
  50
from public.tenant_subscriptions subscription
where subscription.plan_code = 'free'
on conflict (tenant_id, period_start, period_end) do update
set leads_limit = 50;

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
  period_start_value timestamptz;
  period_end_value timestamptz;
begin
  if to_regprocedure(
    'public.platform_reconcile_manual_grant(uuid)'
  ) is not null then
    execute
      'select reconciled.* from public.platform_reconcile_manual_grant($1) reconciled'
      into subscription_row
      using p_tenant_id;
  else
    select * into subscription_row
    from public.tenant_subscriptions
    where tenant_id = p_tenant_id
    for update;
  end if;

  if subscription_row.tenant_id is null then
    period_start_value := date_trunc('month', clock_timestamp());
    period_end_value := period_start_value + interval '1 month';
    insert into public.tenant_subscriptions (
      tenant_id,
      plan_code,
      status,
      current_period_start,
      current_period_end
    )
    values (
      p_tenant_id,
      'free',
      'active',
      period_start_value,
      period_end_value
    )
    returning * into subscription_row;
  end if;

  if subscription_row.plan_code = 'free' then
    period_start_value := date_trunc('month', clock_timestamp());
    period_end_value := period_start_value + interval '1 month';
    if subscription_row.current_period_start is distinct from period_start_value
       or subscription_row.current_period_end is distinct from period_end_value
       or subscription_row.status <> 'active' then
      update public.tenant_subscriptions
      set current_period_start = period_start_value,
          current_period_end = period_end_value,
          status = 'active',
          cancel_at_period_end = false,
          canceled_at = null
      where tenant_id = p_tenant_id
      returning * into subscription_row;
    end if;
  end if;

  select * into strict plan_row
  from public.subscription_plans
  where code = subscription_row.plan_code
    and active;

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
security definer
set search_path = pg_catalog, public
as $$
declare
  tenant_id_value uuid;
  subscription_row public.tenant_subscriptions;
  usage_row public.tenant_usage_periods;
  plan_row public.subscription_plans;
  users_used_value integer;
  admins_used_value integer;
  unlimited_value boolean;
begin
  tenant_id_value := public.current_tenant_id();
  if tenant_id_value is null then
    return null;
  end if;

  usage_row := public.prospecta_ensure_usage_period(tenant_id_value);

  select * into strict subscription_row
  from public.tenant_subscriptions
  where tenant_id = tenant_id_value;

  select * into strict plan_row
  from public.subscription_plans
  where code = subscription_row.plan_code;

  select
    count(*),
    count(*) filter (where membership.role = 'admin')
  into users_used_value, admins_used_value
  from public.tenant_memberships membership
  where membership.tenant_id = tenant_id_value
    and membership.accepted_at is not null;

  unlimited_value := public.prospecta_user_has_unlimited_leads();

  return jsonb_build_object(
    'tenant_id', tenant_id_value,
    'plan_code', subscription_row.plan_code,
    'plan_name', plan_row.name,
    'status', subscription_row.status,
    'monthly_price_cents', plan_row.monthly_price_cents,
    'leads_limit', usage_row.leads_limit,
    'leads_used', usage_row.leads_used,
    'leads_remaining', case
      when unlimited_value then 2147483647
      else greatest(usage_row.leads_limit - usage_row.leads_used, 0)
    end,
    'is_unlimited', unlimited_value,
    'user_limit',
      coalesce((to_jsonb(plan_row) ->> 'user_limit')::integer, 1),
    'users_used', users_used_value,
    'users_remaining', greatest(
      coalesce((to_jsonb(plan_row) ->> 'user_limit')::integer, 1)
        - users_used_value,
      0
    ),
    'admin_limit',
      coalesce((to_jsonb(plan_row) ->> 'admin_limit')::integer, 0),
    'admins_used', admins_used_value,
    'admins_remaining', greatest(
      coalesce((to_jsonb(plan_row) ->> 'admin_limit')::integer, 0)
        - admins_used_value,
      0
    ),
    'current_period_start', subscription_row.current_period_start,
    'current_period_end', subscription_row.current_period_end,
    'cancel_at_period_end', subscription_row.cancel_at_period_end
  );
end;
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
    billing_status := public.prospecta_get_billing_status();
    if coalesce(billing_status ->> 'status', '') not in (
      'active', 'trialing'
    ) then
      raise exception 'Assinatura sem permissão para gerar leads';
    end if;
    if not coalesce(
      (billing_status ->> 'is_unlimited')::boolean,
      false
    ) and coalesce(
      (billing_status ->> 'leads_remaining')::integer,
      0
    ) <= 0 then
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

  remaining_before := case
    when unlimited_value then requested_count
    else greatest(usage_row.leads_limit - usage_row.leads_used, 0)
  end;

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

  result_value := jsonb_build_object(
    'requested', requested_count,
    'inserted', inserted_count,
    'inserted_leads', inserted_leads,
    'processed_leads', processed_leads,
    'remaining', case
      when unlimited_value then 2147483647
      else greatest(remaining_before - inserted_count, 0)
    end,
    'limit_reached', case
      when unlimited_value then false
      else remaining_before <= inserted_count
    end,
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

revoke all on function public.prospecta_user_has_unlimited_leads()
  from public, anon, authenticated;
grant execute on function public.prospecta_user_has_unlimited_leads()
  to authenticated, service_role;

revoke all on function public.prospecta_ensure_usage_period(uuid)
  from public, anon, authenticated;
grant execute on function public.prospecta_ensure_usage_period(uuid)
  to service_role;

revoke all on function public.prospecta_get_billing_status()
  from public, anon;
grant execute on function public.prospecta_get_billing_status()
  to authenticated;

revoke all on function public.prospecta_request_command(
  uuid, text, text
) from public, anon, authenticated;
grant execute on function public.prospecta_request_command(
  uuid, text, text
) to authenticated, service_role;

revoke all on function public.prospecta_insert_leads_with_quota(
  uuid, jsonb, text
) from public, anon;
grant execute on function public.prospecta_insert_leads_with_quota(
  uuid, jsonb, text
) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;

-- Diagnóstico final: os três usuários devem compartilhar a mesma empresa.
-- Se stripe_subscription_id continuar preenchido no plano basic, cancele
-- primeiro a assinatura de teste no Stripe para o webhook voltar ao Free.
select
  lower(account.email) as email,
  tenant.name as empresa,
  subscription.plan_code,
  subscription.status,
  subscription.stripe_subscription_id,
  subscription.current_period_start,
  subscription.current_period_end,
  case
    when lower(account.email) = 'jeanadmin@jvs.com.br'
      then 'ilimitado'
    else plan.leads_per_month::text
  end as limite_individual_exibido
from auth.users account
left join public.profiles profile
  on profile.id = account.id
left join public.tenants tenant
  on tenant.id = profile.active_tenant_id
left join public.tenant_subscriptions subscription
  on subscription.tenant_id = tenant.id
left join public.subscription_plans plan
  on plan.code = subscription.plan_code
where lower(account.email) in (
  'joaovendas@jvs.com.br',
  'gabrieladmin@jvs.com.br',
  'jeanadmin@jvs.com.br'
)
order by lower(account.email);
