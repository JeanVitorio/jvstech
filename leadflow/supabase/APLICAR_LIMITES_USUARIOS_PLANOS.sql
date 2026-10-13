begin;

alter table public.subscription_plans
  add column if not exists user_limit integer not null default 1,
  add column if not exists admin_limit integer not null default 0;

update public.subscription_plans
set
  user_limit = case code
    when 'free' then 1
    when 'basic' then 2
    when 'plus' then 5
    when 'pro' then 10
    else user_limit
  end,
  admin_limit = case code
    when 'free' then 0
    when 'basic' then 1
    when 'plus' then 2
    when 'pro' then 3
    else admin_limit
  end,
  updated_at = clock_timestamp()
where code in ('free', 'basic', 'plus', 'pro');

alter table public.subscription_plans
  drop constraint if exists subscription_plans_user_limit_valid;
alter table public.subscription_plans
  add constraint subscription_plans_user_limit_valid
  check (user_limit >= 1);

alter table public.subscription_plans
  drop constraint if exists subscription_plans_admin_limit_valid;
alter table public.subscription_plans
  add constraint subscription_plans_admin_limit_valid
  check (admin_limit >= 0 and admin_limit < user_limit);

-- Serializa alterações na equipe pela assinatura da empresa para evitar
-- que duas criações simultâneas ultrapassem o limite contratado.
create or replace function public.prospecta_enforce_tenant_user_quota()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  subscription_row public.tenant_subscriptions;
  plan_row public.subscription_plans;
  current_users integer;
  current_admins integer;
begin
  if new.accepted_at is null then
    return new;
  end if;

  select subscription.*
  into subscription_row
  from public.tenant_subscriptions subscription
  where subscription.tenant_id = new.tenant_id
  for update;

  -- O proprietário é criado antes da assinatura durante o cadastro inicial.
  if not found then
    if new.role = 'owner' and not exists (
      select 1
      from public.tenant_memberships membership
      where membership.tenant_id = new.tenant_id
        and membership.accepted_at is not null
        and membership.user_id <> new.user_id
    ) then
      return new;
    end if;
    raise exception 'A empresa ainda não possui um plano configurado';
  end if;

  select plan.*
  into strict plan_row
  from public.subscription_plans plan
  where plan.code = subscription_row.plan_code
    and plan.active;

  select
    count(*),
    count(*) filter (where membership.role = 'admin')
  into current_users, current_admins
  from public.tenant_memberships membership
  where membership.tenant_id = new.tenant_id
    and membership.accepted_at is not null
    and membership.user_id <> new.user_id;

  if current_users >= plan_row.user_limit then
    raise exception 'Limite de usuários do plano atingido';
  end if;

  if new.role = 'admin'
     and current_admins >= plan_row.admin_limit then
    raise exception 'Limite de administradores do plano atingido';
  end if;

  if new.role = 'owner' and exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = new.tenant_id
      and membership.role = 'owner'
      and membership.accepted_at is not null
      and membership.user_id <> new.user_id
  ) then
    raise exception 'A empresa já possui um proprietário';
  end if;

  return new;
end;
$$;

drop trigger if exists tenant_memberships_enforce_user_quota
  on public.tenant_memberships;
create trigger tenant_memberships_enforce_user_quota
before insert or update of tenant_id, role, accepted_at
on public.tenant_memberships
for each row
execute function public.prospecta_enforce_tenant_user_quota();

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
  users_used_value integer;
  admins_used_value integer;
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

  select
    count(*),
    count(*) filter (where membership.role = 'admin')
  into users_used_value, admins_used_value
  from public.tenant_memberships membership
  where membership.tenant_id = tenant_id_value
    and membership.accepted_at is not null;

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
    'user_limit', plan_row.user_limit,
    'users_used', users_used_value,
    'users_remaining', greatest(plan_row.user_limit - users_used_value, 0),
    'admin_limit', plan_row.admin_limit,
    'admins_used', admins_used_value,
    'admins_remaining', greatest(plan_row.admin_limit - admins_used_value, 0),
    'current_period_start', subscription_row.current_period_start,
    'current_period_end', subscription_row.current_period_end,
    'cancel_at_period_end', subscription_row.cancel_at_period_end
  );
end;
$$;

revoke all on function public.prospecta_enforce_tenant_user_quota()
  from public, anon, authenticated;
revoke all on function public.prospecta_get_billing_status()
  from public, anon;
grant execute on function public.prospecta_get_billing_status()
  to authenticated;

notify pgrst, 'reload schema';

commit;
