begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'tenant_role'
  ) then
    create type public.tenant_role as enum ('owner', 'admin', 'member');
  end if;
end;
$$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'closed')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_name_not_blank check (btrim(name) <> ''),
  constraint tenants_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tenant_role not null default 'member',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists tenant_memberships_user_idx
  on public.tenant_memberships (user_id, tenant_id);

alter table public.profiles
  add column if not exists active_tenant_id uuid
    references public.tenants(id) on delete set null;

create table if not exists public.subscription_plans (
  code text primary key,
  name text not null,
  monthly_price_cents integer not null,
  leads_per_month integer not null,
  stripe_product_id text unique,
  stripe_price_id text unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plans_price_valid
    check (monthly_price_cents >= 0),
  constraint subscription_plans_limit_valid
    check (leads_per_month > 0)
);

insert into public.subscription_plans (
  code, name, monthly_price_cents, leads_per_month, stripe_product_id
)
values
  ('free', 'LeadFlow Free', 0, 50, null),
  ('basic', 'LeadFlow Básico', 19700, 500, 'prod_VQ19NexD5CVClF'),
  ('plus', 'LeadFlow Plus', 39700, 1500, 'prod_VQ1BGF4rzcw5fQ'),
  ('pro', 'LeadFlow Pro', 59700, 3000, 'prod_VQ1GqTFYTxptNW')
on conflict (code) do update
set name = excluded.name,
    monthly_price_cents = excluded.monthly_price_cents,
    leads_per_month = excluded.leads_per_month,
    stripe_product_id = excluded.stripe_product_id,
    updated_at = clock_timestamp();

create table if not exists public.tenant_subscriptions (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  stripe_subscription_id text unique,
  status text not null default 'active',
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  stripe_last_event_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_subscriptions_period_valid
    check (current_period_end > current_period_start)
);

create table if not exists public.tenant_usage_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  leads_limit integer not null,
  leads_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, period_start, period_end),
  constraint tenant_usage_periods_dates_valid
    check (period_end > period_start),
  constraint tenant_usage_periods_values_valid
    check (leads_limit > 0 and leads_used >= 0)
);

create index if not exists tenant_usage_periods_current_idx
  on public.tenant_usage_periods (tenant_id, period_end desc);

create table if not exists public.tenant_usage_ledger (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usage_period_id uuid not null
    references public.tenant_usage_periods(id) on delete cascade,
  event_type text not null
    check (event_type in ('lead_import', 'adjustment', 'refund')),
  quantity integer not null,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint tenant_usage_ledger_quantity_valid check (quantity <> 0),
  constraint tenant_usage_ledger_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  payload_hash text not null,
  event_created_at timestamptz not null,
  processed_at timestamptz not null default now()
);

create table if not exists public.prospecta_lead_import_batches (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  batch_key text not null,
  bot_id uuid,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, batch_key),
  constraint prospecta_lead_import_batches_result_object
    check (jsonb_typeof(result) = 'object')
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clients',
    'teams',
    'team_members',
    'client_teams',
    'team_clients',
    'client_collaborators',
    'client_satisfaction_history',
    'services',
    'client_services',
    'kanban_columns',
    'user_kanban_columns',
    'tasks',
    'comments',
    'time_entries',
    'notifications',
    'expenses',
    'cash_adjustments',
    'finance_settings',
    'extra_services',
    'team_notes',
    'lead_stages',
    'leads',
    'lead_activities',
    'sales_events',
    'sales_tiles',
    'lead_script_flows',
    'studio_clients',
    'studio_shoots',
    'studio_followups',
    'studio_sessions',
    'studio_expenses',
    'prospecta_bot_configs',
    'prospecta_bot_checkpoints',
    'prospecta_bot_controls',
    'prospecta_bot_runners',
    'prospecta_bot_events',
    'prospecta_whatsapp_sessions',
    'prospecta_message_bot_configs',
    'prospecta_message_bot_controls',
    'prospecta_message_bot_runtime',
    'prospecta_message_deliveries'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format(
        'alter table public.%I add column if not exists tenant_id uuid '
        'references public.tenants(id) on delete cascade',
        table_name
      );
      execute format(
        'create index if not exists %I on public.%I (tenant_id)',
        table_name || '_tenant_idx',
        table_name
      );
    end if;
  end loop;
end;
$$;

alter table public.leads
  add column if not exists dedupe_key text;

do $$
declare
  default_tenant_id uuid;
  table_name text;
begin
  select id into default_tenant_id
  from public.tenants
  order by created_at, id
  limit 1;

  if default_tenant_id is null and exists (
    select 1 from public.profiles
  ) then
    insert into public.tenants (name, slug)
    values ('JVS LeadFlow', 'jvs-leadflow')
    returning id into default_tenant_id;
  end if;

  if default_tenant_id is null then
    return;
  end if;

  insert into public.tenant_memberships (
    tenant_id, user_id, role, accepted_at
  )
  select
    default_tenant_id,
    profile.id,
    case
      when exists (
        select 1 from public.user_roles role_row
        where role_row.user_id = profile.id
          and role_row.role::text = 'leader'
      ) then 'owner'::public.tenant_role
      when exists (
        select 1 from public.user_roles role_row
        where role_row.user_id = profile.id
          and role_row.role::text = 'manager'
      ) then 'admin'::public.tenant_role
      else 'member'::public.tenant_role
    end,
    clock_timestamp()
  from public.profiles profile
  on conflict (tenant_id, user_id) do nothing;

  update public.profiles
  set active_tenant_id = default_tenant_id
  where active_tenant_id is null;

  insert into public.tenant_subscriptions (
    tenant_id,
    plan_code,
    status,
    current_period_start,
    current_period_end
  )
  select
    tenant.id,
    'free',
    'active',
    date_trunc('day', tenant.created_at),
    date_trunc('day', tenant.created_at) + interval '1 month'
  from public.tenants tenant
  on conflict (tenant_id) do nothing;

  insert into public.tenant_usage_periods (
    tenant_id, period_start, period_end, leads_limit
  )
  select
    subscription.tenant_id,
    subscription.current_period_start,
    subscription.current_period_end,
    plan.leads_per_month
  from public.tenant_subscriptions subscription
  join public.subscription_plans plan
    on plan.code = subscription.plan_code
  on conflict (tenant_id, period_start, period_end) do nothing;

  update public.lead_stages
  set tenant_id = default_tenant_id
  where tenant_id is null;

  update public.leads
  set tenant_id = coalesce(
    (
      select membership.tenant_id
      from public.tenant_memberships membership
      where membership.user_id = leads.owner_id
      order by membership.created_at
      limit 1
    ),
    default_tenant_id
  )
  where tenant_id is null;

  update public.prospecta_bot_configs
  set tenant_id = coalesce(
    (
      select membership.tenant_id
      from public.tenant_memberships membership
      where membership.user_id = prospecta_bot_configs.lead_owner_id
      order by membership.created_at
      limit 1
    ),
    default_tenant_id
  )
  where tenant_id is null;

  update public.prospecta_bot_checkpoints child
  set tenant_id = parent.tenant_id
  from public.prospecta_bot_configs parent
  where child.bot_id = parent.id
    and child.tenant_id is null;

  update public.prospecta_bot_controls child
  set tenant_id = parent.tenant_id
  from public.prospecta_bot_configs parent
  where child.bot_id = parent.id
    and child.tenant_id is null;

  update public.prospecta_bot_events child
  set tenant_id = parent.tenant_id
  from public.prospecta_bot_configs parent
  where child.bot_id = parent.id
    and child.tenant_id is null;

  foreach table_name in array array[
    'clients',
    'teams',
    'team_members',
    'client_teams',
    'team_clients',
    'client_collaborators',
    'client_satisfaction_history',
    'services',
    'client_services',
    'kanban_columns',
    'user_kanban_columns',
    'tasks',
    'comments',
    'time_entries',
    'notifications',
    'expenses',
    'cash_adjustments',
    'finance_settings',
    'extra_services',
    'team_notes',
    'lead_activities',
    'sales_events',
    'sales_tiles',
    'lead_script_flows',
    'studio_clients',
    'studio_shoots',
    'studio_followups',
    'studio_sessions',
    'studio_expenses',
    'prospecta_bot_runners',
    'prospecta_whatsapp_sessions',
    'prospecta_message_bot_configs',
    'prospecta_message_bot_controls',
    'prospecta_message_bot_runtime',
    'prospecta_message_deliveries'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format(
        'update public.%I set tenant_id = $1 where tenant_id is null',
        table_name
      ) using default_tenant_id;
    end if;
  end loop;
end;
$$;

drop index if exists public.lead_stages_name_unique_idx;
drop index if exists public.lead_stages_tenant_name_uidx;
create index if not exists lead_stages_tenant_name_idx
  on public.lead_stages (tenant_id, lower(name));

alter table public.tasks
  drop constraint if exists tasks_column_id_fkey;
alter table public.kanban_columns
  drop constraint if exists kanban_columns_pkey;
alter table public.kanban_columns
  alter column tenant_id set not null;
alter table public.kanban_columns
  add constraint kanban_columns_pkey primary key (tenant_id, id);
alter table public.tasks
  add constraint tasks_tenant_column_fkey
  foreign key (tenant_id, column_id)
  references public.kanban_columns (tenant_id, id)
  on delete set null (column_id);

alter table public.finance_settings
  drop constraint if exists finance_settings_pkey;
alter table public.finance_settings
  alter column tenant_id set not null;
alter table public.finance_settings
  add constraint finance_settings_pkey primary key (tenant_id, key);

drop index if exists public.prospecta_bot_configs_slug_active_uidx;
create unique index prospecta_bot_configs_tenant_slug_active_uidx
  on public.prospecta_bot_configs (tenant_id, slug)
  where deleted_at is null;

drop index if exists public.prospecta_message_bots_slug_active_uidx;
create unique index prospecta_message_bots_tenant_slug_active_uidx
  on public.prospecta_message_bot_configs (tenant_id, slug)
  where deleted_at is null;

create or replace function public.prospecta_touch_saas_row()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists tenants_touch on public.tenants;
create trigger tenants_touch
before update on public.tenants
for each row execute function public.prospecta_touch_saas_row();

drop trigger if exists tenant_memberships_touch
  on public.tenant_memberships;
create trigger tenant_memberships_touch
before update on public.tenant_memberships
for each row execute function public.prospecta_touch_saas_row();

drop trigger if exists tenant_subscriptions_touch
  on public.tenant_subscriptions;
create trigger tenant_subscriptions_touch
before update on public.tenant_subscriptions
for each row execute function public.prospecta_touch_saas_row();

drop trigger if exists tenant_usage_periods_touch
  on public.tenant_usage_periods;
create trigger tenant_usage_periods_touch
before update on public.tenant_usage_periods
for each row execute function public.prospecta_touch_saas_row();

commit;
