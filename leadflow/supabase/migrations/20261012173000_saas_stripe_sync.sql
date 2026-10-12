begin;

create or replace function public.prospecta_sync_stripe_subscription(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_payload_hash text,
  p_tenant_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_price_id text,
  p_product_id text,
  p_status text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  plan_row public.subscription_plans;
  effective_plan_code text;
  effective_status text;
  effective_start timestamptz;
  effective_end timestamptz;
  last_event_created_at timestamptz;
begin
  if btrim(coalesce(p_event_id, '')) = ''
     or btrim(coalesce(p_event_type, '')) = ''
     or btrim(coalesce(p_payload_hash, '')) = ''
     or p_event_created_at is null then
    raise exception 'Evento Stripe inválido';
  end if;
  if not exists (
    select 1 from public.tenants where id = p_tenant_id
  ) then
    raise exception 'Empresa do evento Stripe não encontrada';
  end if;

  insert into public.stripe_webhook_events (
    stripe_event_id, event_type, payload_hash, event_created_at
  )
  values (
    p_event_id, p_event_type, p_payload_hash, p_event_created_at
  )
  on conflict (stripe_event_id) do nothing;

  if not found then
    return false;
  end if;

  select stripe_last_event_created_at
  into last_event_created_at
  from public.tenant_subscriptions
  where tenant_id = p_tenant_id
  for update;

  if last_event_created_at is not null
     and p_event_created_at < last_event_created_at then
    return true;
  end if;

  update public.tenants
  set stripe_customer_id = coalesce(
        nullif(btrim(p_customer_id), ''),
        stripe_customer_id
      )
  where id = p_tenant_id;

  if p_event_type = 'customer.subscription.deleted' then
    select * into plan_row
    from public.subscription_plans
    where code = 'free';
    effective_plan_code := 'free';
    effective_status := 'active';
    effective_start := date_trunc('day', clock_timestamp());
    effective_end := effective_start + interval '1 month';
  else
    select * into plan_row
    from public.subscription_plans
    where active
      and (
        stripe_price_id = nullif(btrim(p_price_id), '')
        or stripe_product_id = nullif(btrim(p_product_id), '')
      )
    order by
      case when stripe_price_id = nullif(btrim(p_price_id), '')
        then 0 else 1 end
    limit 1;

    if not found then
      raise exception 'Preço ou produto Stripe não mapeado';
    end if;

    if plan_row.stripe_price_id is null
       and nullif(btrim(p_price_id), '') is not null then
      update public.subscription_plans
      set stripe_price_id = btrim(p_price_id)
      where code = plan_row.code
        and stripe_price_id is null;
    end if;

    effective_plan_code := plan_row.code;
    effective_status := coalesce(nullif(btrim(p_status), ''), 'incomplete');
    effective_start := p_period_start;
    effective_end := p_period_end;
  end if;

  if effective_start is null
     or effective_end is null
     or effective_end <= effective_start then
    raise exception 'Período Stripe inválido';
  end if;

  insert into public.tenant_subscriptions (
    tenant_id,
    plan_code,
    stripe_subscription_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    canceled_at,
    stripe_last_event_created_at
  )
  values (
    p_tenant_id,
    effective_plan_code,
    case
      when effective_plan_code = 'free' then null
      else nullif(btrim(p_subscription_id), '')
    end,
    effective_status,
    effective_start,
    effective_end,
    case
      when effective_plan_code = 'free' then false
      else coalesce(p_cancel_at_period_end, false)
    end,
    case
      when p_event_type = 'customer.subscription.deleted'
        then clock_timestamp()
      else null
    end,
    p_event_created_at
  )
  on conflict (tenant_id) do update
  set plan_code = excluded.plan_code,
      stripe_subscription_id = excluded.stripe_subscription_id,
      status = excluded.status,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      canceled_at = excluded.canceled_at,
      stripe_last_event_created_at =
        excluded.stripe_last_event_created_at;

  insert into public.tenant_usage_periods (
    tenant_id,
    period_start,
    period_end,
    leads_limit
  )
  values (
    p_tenant_id,
    effective_start,
    effective_end,
    plan_row.leads_per_month
  )
  on conflict (tenant_id, period_start, period_end) do update
  set leads_limit = excluded.leads_limit;

  return true;
end;
$$;

revoke all on function public.prospecta_sync_stripe_subscription(
  text,
  text,
  timestamptz,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean
) from public, anon, authenticated;
grant execute on function public.prospecta_sync_stripe_subscription(
  text,
  text,
  timestamptz,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean
) to service_role;

commit;
