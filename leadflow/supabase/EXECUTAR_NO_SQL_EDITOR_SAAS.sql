-- Prospecta Flow SaaS - implanta??o manual consolidada
-- Execute este arquivo inteiro uma ?nica vez no SQL Editor do Supabase.
-- As transa??es internas preservam a ordem e evitam aplica??o parcial de cada etapa.

-- ============================================================
-- ETAPA: 20261012170000_saas_tenants_billing.sql
-- ============================================================

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


-- ============================================================
-- ETAPA: 20261012171000_saas_auth_rls.sql
-- ============================================================

begin;

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (
      select profile.active_tenant_id
      from public.profiles profile
      join public.tenant_memberships membership
        on membership.tenant_id = profile.active_tenant_id
       and membership.user_id = profile.id
       and membership.accepted_at is not null
      where profile.id = auth.uid()
    ),
    (
      select membership.tenant_id
      from public.tenant_memberships membership
      where membership.user_id = auth.uid()
        and membership.accepted_at is not null
      order by membership.created_at, membership.tenant_id
      limit 1
    )
  );
$$;

create or replace function public.is_tenant_member(
  p_tenant_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = p_tenant_id
      and membership.user_id = p_user_id
      and membership.accepted_at is not null
  );
$$;

create or replace function public.can_manage_tenant(
  p_tenant_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = p_tenant_id
      and membership.user_id = p_user_id
      and membership.accepted_at is not null
      and membership.role in ('owner', 'admin')
  );
$$;

create or replace function public.prospecta_assign_current_tenant()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.tenant_id is null and auth.uid() is not null then
    new.tenant_id := public.current_tenant_id();
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
  trigger_name text;
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
      trigger_name := table_name || '_assign_tenant';
      execute format(
        'drop trigger if exists %I on public.%I',
        trigger_name,
        table_name
      );
      execute format(
        'create trigger %I before insert on public.%I '
        'for each row execute function public.prospecta_assign_current_tenant()',
        trigger_name,
        table_name
      );
    end if;
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  tenant_id_from_invite uuid;
  new_tenant_id uuid;
  tenant_name text;
  tenant_slug text;
  requested_role text;
  period_start timestamptz;
  period_end timestamptz;
begin
  insert into public.profiles (id, name, email, is_active)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    true
  )
  on conflict (id) do update
  set email = excluded.email,
      name = coalesce(nullif(public.profiles.name, ''), excluded.name),
      is_active = true;

  begin
    tenant_id_from_invite :=
      nullif(new.raw_app_meta_data ->> 'tenant_id', '')::uuid;
  exception when invalid_text_representation then
    tenant_id_from_invite := null;
  end;

  requested_role := coalesce(
    nullif(new.raw_app_meta_data ->> 'app_role', ''),
    'collaborator'
  );
  if requested_role not in (
    'leader', 'manager', 'commercial', 'collaborator'
  ) then
    requested_role := 'collaborator';
  end if;

  insert into public.user_roles (user_id, role)
  values (new.id, requested_role::public.app_role)
  on conflict do nothing;

  if tenant_id_from_invite is not null and exists (
    select 1 from public.tenants where id = tenant_id_from_invite
  ) then
    insert into public.tenant_memberships (
      tenant_id, user_id, role, accepted_at
    )
    values (
      tenant_id_from_invite,
      new.id,
      case
        when requested_role in ('leader', 'manager')
          then 'admin'::public.tenant_role
        else 'member'::public.tenant_role
      end,
      clock_timestamp()
    )
    on conflict (tenant_id, user_id) do update
    set accepted_at = excluded.accepted_at;
    new_tenant_id := tenant_id_from_invite;
  else
    tenant_name := coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'company_name'), ''),
      'Empresa de ' || split_part(new.email, '@', 1)
    );
    tenant_slug := trim(both '-' from regexp_replace(
      lower(tenant_name),
      '[^a-z0-9]+',
      '-',
      'g'
    ));
    tenant_slug := coalesce(nullif(tenant_slug, ''), 'empresa')
      || '-' || substr(replace(new.id::text, '-', ''), 1, 8);

    insert into public.tenants (name, slug)
    values (tenant_name, tenant_slug)
    returning id into new_tenant_id;

    insert into public.tenant_memberships (
      tenant_id, user_id, role, accepted_at
    )
    values (
      new_tenant_id, new.id, 'owner', clock_timestamp()
    );

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
      new_tenant_id,
      'free',
      'active',
      period_start,
      period_end
    );

    insert into public.tenant_usage_periods (
      tenant_id,
      period_start,
      period_end,
      leads_limit
    )
    values (new_tenant_id, period_start, period_end, 50);

    insert into public.lead_stages (
      tenant_id, name, color, position, is_won, is_lost
    )
    values
      (new_tenant_id, 'Novo lead', '#6366f1', 0, false, false),
      (new_tenant_id, 'Em contato', '#f59e0b', 1, false, false),
      (new_tenant_id, 'Convertido', '#22c55e', 2, true, false),
      (new_tenant_id, 'Perdido', '#ef4444', 3, false, true);

    insert into public.kanban_columns (
      tenant_id, id, title, accent, "order", base
    )
    values
      (
        new_tenant_id, 'todo', 'A Fazer',
        'bg-muted-foreground', 0, 'todo'
      ),
      (
        new_tenant_id, 'in_progress', 'Em Andamento',
        'bg-primary', 1, 'in_progress'
      ),
      (
        new_tenant_id, 'review', 'Em Revisão',
        'bg-warning', 2, 'review'
      ),
      (
        new_tenant_id, 'done', 'Concluído',
        'bg-success', 3, 'done'
      );
  end if;

  update public.profiles
  set active_tenant_id = new_tenant_id
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.tenant_usage_periods enable row level security;
alter table public.tenant_usage_ledger enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.prospecta_lead_import_batches enable row level security;

drop policy if exists tenants_member_select on public.tenants;
create policy tenants_member_select
on public.tenants for select to authenticated
using (public.is_tenant_member(id));

drop policy if exists tenants_manager_update on public.tenants;
create policy tenants_manager_update
on public.tenants for update to authenticated
using (public.can_manage_tenant(id))
with check (public.can_manage_tenant(id));

drop policy if exists memberships_tenant_select
  on public.tenant_memberships;
create policy memberships_tenant_select
on public.tenant_memberships for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists plans_public_select on public.subscription_plans;
create policy plans_public_select
on public.subscription_plans for select to anon, authenticated
using (active);

drop policy if exists subscriptions_tenant_select
  on public.tenant_subscriptions;
create policy subscriptions_tenant_select
on public.tenant_subscriptions for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists usage_periods_tenant_select
  on public.tenant_usage_periods;
create policy usage_periods_tenant_select
on public.tenant_usage_periods for select to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists usage_ledger_tenant_select
  on public.tenant_usage_ledger;
create policy usage_ledger_tenant_select
on public.tenant_usage_ledger for select to authenticated
using (public.is_tenant_member(tenant_id));

do $$
declare
  table_name text;
  policy_row record;
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
    if to_regclass('public.' || table_name) is null then
      continue;
    end if;
    execute format('alter table public.%I enable row level security', table_name);
    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_row.policyname,
        table_name
      );
    end loop;
    execute format(
      'create policy %I on public.%I for select to authenticated '
      'using (public.is_tenant_member(tenant_id))',
      table_name || '_tenant_select',
      table_name
    );
  end loop;
end;
$$;

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
    'extra_services',
    'team_notes',
    'lead_stages',
    'lead_activities',
    'sales_events',
    'sales_tiles',
    'lead_script_flows',
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
        'create policy %I on public.%I for all to authenticated '
        'using (public.is_tenant_member(tenant_id)) '
        'with check (tenant_id = public.current_tenant_id() '
        'and public.is_tenant_member(tenant_id))',
        table_name || '_tenant_write',
        table_name
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'expenses',
    'cash_adjustments',
    'finance_settings',
    'studio_clients',
    'studio_shoots',
    'studio_followups',
    'studio_sessions',
    'studio_expenses'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format(
        'create policy %I on public.%I for all to authenticated '
        'using (public.can_manage_tenant(tenant_id)) '
        'with check (tenant_id = public.current_tenant_id() '
        'and public.can_manage_tenant(tenant_id))',
        table_name || '_tenant_manage',
        table_name
      );
    end if;
  end loop;
end;
$$;

create policy leads_tenant_insert
on public.leads for insert to authenticated
with check (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_member(tenant_id)
);

create policy leads_tenant_update
on public.leads for update to authenticated
using (public.is_tenant_member(tenant_id))
with check (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_member(tenant_id)
);

create policy leads_tenant_delete
on public.leads for delete to authenticated
using (
  public.can_manage_tenant(tenant_id)
  or owner_id = auth.uid()
);

create policy bot_configs_tenant_insert
on public.prospecta_bot_configs for insert to authenticated
with check (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_member(tenant_id)
);

create policy bot_configs_tenant_update
on public.prospecta_bot_configs for update to authenticated
using (
  public.can_manage_tenant(tenant_id)
  or lead_owner_id = auth.uid()
)
with check (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_member(tenant_id)
);

do $$
declare
  policy_row record;
begin
  for policy_row in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'user_roles')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_row.policyname,
      policy_row.tablename
    );
  end loop;
end;
$$;

drop policy if exists profiles_tenant_select on public.profiles;
create policy profiles_tenant_select
on public.profiles for select to authenticated
using (
  exists (
    select 1
    from public.tenant_memberships mine
    join public.tenant_memberships theirs
      on theirs.tenant_id = mine.tenant_id
    where mine.user_id = auth.uid()
      and mine.accepted_at is not null
      and theirs.user_id = profiles.id
      and theirs.accepted_at is not null
  )
);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists user_roles_tenant_select on public.user_roles;
create policy user_roles_tenant_select
on public.user_roles for select to authenticated
using (
  exists (
    select 1
    from public.tenant_memberships mine
    join public.tenant_memberships theirs
      on theirs.tenant_id = mine.tenant_id
    where mine.user_id = auth.uid()
      and mine.accepted_at is not null
      and theirs.user_id = user_roles.user_id
      and theirs.accepted_at is not null
  )
);

revoke all on table public.stripe_webhook_events
  from public, anon, authenticated;
revoke all on table public.prospecta_lead_import_batches
  from public, anon, authenticated;
grant select on table public.subscription_plans to anon, authenticated;
revoke insert, update, delete on table public.tenants from authenticated;
grant select on table public.tenants to authenticated;
grant select on table public.tenant_memberships to authenticated;
grant select on table public.tenant_subscriptions to authenticated;
grant select on table public.tenant_usage_periods to authenticated;
grant select on table public.tenant_usage_ledger to authenticated;
grant select, insert, update, delete
  on table public.prospecta_bot_checkpoints to authenticated;
grant select, insert, update, delete
  on table public.prospecta_bot_controls to authenticated;
grant select, insert, update, delete
  on table public.prospecta_bot_runners to authenticated;
grant select, insert, update
  on table public.prospecta_bot_events to authenticated;
grant usage, select on sequence public.prospecta_bot_events_id_seq
  to authenticated;

grant usage on schema public to service_role;
grant select on table
  public.profiles,
  public.tenant_memberships,
  public.tenants,
  public.subscription_plans,
  public.tenant_subscriptions
to service_role;
grant update (stripe_customer_id)
  on table public.tenants to service_role;

revoke all on function public.current_tenant_id()
  from public, anon;
revoke all on function public.is_tenant_member(uuid, uuid)
  from public, anon;
revoke all on function public.can_manage_tenant(uuid, uuid)
  from public, anon;
grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.is_tenant_member(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.can_manage_tenant(uuid, uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';

commit;


-- ============================================================
-- ETAPA: 20261012172000_saas_quota_rpcs.sql
-- ============================================================

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


-- ============================================================
-- ETAPA: 20261012173000_saas_stripe_sync.sql
-- ============================================================

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


-- ============================================================
-- ETAPA: 20261012174000_saas_message_bot_rpcs.sql
-- ============================================================

begin;

create or replace function public.prospecta_validate_lead_tenant_links()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  if new.owner_id is not null
     and not public.is_tenant_member(new.tenant_id, new.owner_id) then
    raise exception 'O responsável pelo lead não pertence à empresa';
  end if;
  if new.stage_id is not null
     and not exists (
       select 1
       from public.lead_stages stage
       where stage.id = new.stage_id
         and stage.tenant_id = new.tenant_id
     ) then
    raise exception 'O estágio do lead não pertence à empresa';
  end if;
  return new;
end;
$$;

drop trigger if exists zz_leads_validate_tenant_links on public.leads;
create trigger zz_leads_validate_tenant_links
before insert or update on public.leads
for each row execute function public.prospecta_validate_lead_tenant_links();

create or replace function public.prospecta_validate_bot_tenant_links()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  if new.lead_owner_id is not null
     and not public.is_tenant_member(
       new.tenant_id,
       new.lead_owner_id
     ) then
    raise exception 'O responsável pelo bot não pertence à empresa';
  end if;
  return new;
end;
$$;

drop trigger if exists zz_bot_configs_validate_tenant_links
  on public.prospecta_bot_configs;
create trigger zz_bot_configs_validate_tenant_links
before insert or update on public.prospecta_bot_configs
for each row execute function public.prospecta_validate_bot_tenant_links();

create or replace function public.prospecta_validate_session_tenant_links()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  if not public.is_tenant_member(new.tenant_id, new.owner_id) then
    raise exception 'O responsável pela sessão não pertence à empresa';
  end if;
  return new;
end;
$$;

drop trigger if exists zz_whatsapp_sessions_validate_tenant_links
  on public.prospecta_whatsapp_sessions;
create trigger zz_whatsapp_sessions_validate_tenant_links
before insert or update on public.prospecta_whatsapp_sessions
for each row
execute function public.prospecta_validate_session_tenant_links();

create or replace function public.prospecta_validate_message_bot_links()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  if not public.is_tenant_member(new.tenant_id, new.created_by)
     or not public.is_tenant_member(
       new.tenant_id,
       new.lead_owner_id
     ) then
    raise exception 'Os usuários do bot não pertencem à empresa';
  end if;
  if not exists (
    select 1
    from public.prospecta_whatsapp_sessions session
    where session.id = new.whatsapp_session_id
      and session.tenant_id = new.tenant_id
      and session.deleted_at is null
  ) then
    raise exception 'A sessão do WhatsApp não pertence à empresa';
  end if;
  if not exists (
    select 1
    from public.lead_stages stage
    where stage.id = new.source_stage_id
      and stage.tenant_id = new.tenant_id
  ) or not exists (
    select 1
    from public.lead_stages stage
    where stage.id = new.target_stage_id
      and stage.tenant_id = new.tenant_id
  ) then
    raise exception 'Os estágios do bot não pertencem à empresa';
  end if;
  return new;
end;
$$;

drop trigger if exists zz_message_bot_configs_validate_tenant_links
  on public.prospecta_message_bot_configs;
create trigger zz_message_bot_configs_validate_tenant_links
before insert or update on public.prospecta_message_bot_configs
for each row execute function public.prospecta_validate_message_bot_links();

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
    or exists (
      select 1
      from public.prospecta_message_bot_configs config
      where config.id = p_bot_id
        and config.deleted_at is null
        and config.tenant_id = public.current_tenant_id()
        and public.is_tenant_member(config.tenant_id)
    );
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
    select item.tenant_id, item.owner_id, item.source as value
    from public.leads item
    union all
    select item.tenant_id, item.owner_id, item.niche as value
    from public.leads item
  ) lead
  where lead.owner_id = p_owner_id
    and btrim(coalesce(lead.value, '')) <> ''
    and (
      auth.role() = 'service_role'
      or (
        lead.tenant_id = public.current_tenant_id()
        and public.is_tenant_member(lead.tenant_id)
        and public.is_tenant_member(lead.tenant_id, p_owner_id)
      )
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
declare
  tenant_id_value uuid;
begin
  if p_command not in ('rodando', 'pausado', 'parado') then
    raise exception 'Comando inválido';
  end if;
  if not public.prospecta_can_access_message_bot(p_bot_id) then
    raise exception 'Acesso negado ao bot de mensagens';
  end if;

  select tenant_id into tenant_id_value
  from public.prospecta_message_bot_configs
  where id = p_bot_id and deleted_at is null;

  if p_command = 'rodando'
     and btrim(coalesce(p_target_runner_id, '')) = '' then
    raise exception 'Executor é obrigatório para iniciar';
  end if;
  if p_command = 'rodando'
     and not exists (
       select 1
       from public.prospecta_bot_runners runner
       where runner.id = p_target_runner_id
         and runner.tenant_id = tenant_id_value
         and runner.status = 'online'
         and runner.heartbeat_at
           >= clock_timestamp() - interval '90 seconds'
     ) then
    raise exception 'Executor indisponível para esta empresa';
  end if;
  if p_command = 'rodando' and exists (
    select 1
    from public.prospecta_message_bot_configs config
    join public.prospecta_whatsapp_sessions session
      on session.id = config.whatsapp_session_id
     and session.tenant_id = config.tenant_id
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
  config_row public.prospecta_message_bot_configs%rowtype;
  delivery_row public.prospecta_message_deliveries%rowtype;
  lead_row public.leads%rowtype;
  phone_value text;
begin
  if btrim(coalesce(p_runner_id, '')) = '' then
    raise exception 'Executor é obrigatório';
  end if;
  if p_lease_seconds < 60 or p_lease_seconds > 3600 then
    raise exception 'Lease inválido';
  end if;

  select * into config_row
  from public.prospecta_message_bot_configs
  where id = p_bot_id and deleted_at is null;

  if not found then
    return null;
  end if;
  if auth.role() <> 'service_role'
     and not public.is_tenant_member(config_row.tenant_id) then
    raise exception 'Acesso negado ao bot de mensagens';
  end if;
  if auth.role() <> 'service_role'
     and not exists (
       select 1
       from public.prospecta_bot_runners runner
       where runner.id = p_runner_id
         and runner.tenant_id = config_row.tenant_id
     ) then
    raise exception 'Executor não pertence à empresa';
  end if;
  if not exists (
    select 1
    from public.prospecta_message_bot_controls control
    where control.bot_id = p_bot_id
      and control.tenant_id = config_row.tenant_id
      and control.command = 'rodando'
      and control.target_runner_id = p_runner_id
  ) then
    return null;
  end if;

  select delivery.* into delivery_row
  from public.prospecta_message_deliveries delivery
  where delivery.bot_id = p_bot_id
    and delivery.tenant_id = config_row.tenant_id
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
    where id = delivery_row.id
    returning * into delivery_row;

    select * into lead_row
    from public.leads
    where id = delivery_row.lead_id
      and tenant_id = config_row.tenant_id;

    if not found
       or lead_row.owner_id is distinct from config_row.lead_owner_id
       or not (
         coalesce(lead_row.niche, '') = config_row.niche
         or coalesce(lead_row.source, '') = config_row.niche
       )
       or lead_row.stage_id is distinct from config_row.source_stage_id
       or coalesce(lead_row.whatsapp_do_not_contact, false)
    then
      update public.prospecta_message_deliveries
      set status = 'failed',
          error_code = 'lead_no_longer_eligible',
          lease_expires_at = clock_timestamp()
      where id = delivery_row.id;
      return null;
    end if;
  else
    select lead.* into lead_row
    from public.leads lead
    where lead.tenant_id = config_row.tenant_id
      and lead.owner_id = config_row.lead_owner_id
      and (
        coalesce(lead.niche, '') = config_row.niche
        or coalesce(lead.source, '') = config_row.niche
      )
      and lead.stage_id = config_row.source_stage_id
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

    phone_value := coalesce(nullif(lead_row.whatsapp, ''), lead_row.phone);
    insert into public.prospecta_message_deliveries (
      bot_id,
      tenant_id,
      lead_id,
      whatsapp_session_id,
      phone_normalized,
      claimed_by,
      lease_expires_at
    )
    values (
      p_bot_id,
      config_row.tenant_id,
      lead_row.id,
      config_row.whatsapp_session_id,
      regexp_replace(phone_value, '[^0-9]', '', 'g'),
      p_runner_id,
      clock_timestamp() + make_interval(secs => p_lease_seconds)
    )
    returning * into delivery_row;
  end if;

  return jsonb_build_object(
    'delivery_id', delivery_row.id,
    'claim_token', delivery_row.claim_token,
    'lead_id', lead_row.id,
    'name', lead_row.name,
    'company', lead_row.company,
    'niche', config_row.niche,
    'phone', coalesce(nullif(lead_row.whatsapp, ''), lead_row.phone)
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
  delivery_row public.prospecta_message_deliveries%rowtype;
  target_stage_id_value uuid;
begin
  if p_status not in ('sent', 'invalid', 'failed') then
    raise exception 'Status final inválido';
  end if;

  select * into delivery_row
  from public.prospecta_message_deliveries
  where id = p_delivery_id
    and claim_token = p_claim_token
    and status = 'claimed'
  for update;

  if not found then
    return false;
  end if;
  if auth.role() <> 'service_role'
     and not public.is_tenant_member(delivery_row.tenant_id) then
    raise exception 'Acesso negado à entrega';
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
    select target_stage_id into target_stage_id_value
    from public.prospecta_message_bot_configs
    where id = delivery_row.bot_id
      and tenant_id = delivery_row.tenant_id;

    update public.leads
    set stage_id = target_stage_id_value,
        updated_at = clock_timestamp()
    where id = delivery_row.lead_id
      and tenant_id = delivery_row.tenant_id;
  end if;

  insert into public.prospecta_message_bot_runtime (
    bot_id,
    tenant_id,
    sent_count,
    invalid_count,
    failed_count
  )
  values (
    delivery_row.bot_id,
    delivery_row.tenant_id,
    case when p_status = 'sent' then 1 else 0 end,
    case when p_status = 'invalid' then 1 else 0 end,
    case when p_status = 'failed' then 1 else 0 end
  )
  on conflict (bot_id) do update
  set tenant_id = excluded.tenant_id,
      sent_count = prospecta_message_bot_runtime.sent_count
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
  from public.prospecta_message_deliveries delivery
  join public.prospecta_message_bot_configs config
    on config.id = delivery.bot_id
   and config.tenant_id = delivery.tenant_id
  where delivery.bot_id = p_bot_id
    and delivery.status = 'sent'
    and delivery.sent_at >= clock_timestamp() - interval '1 hour'
    and (
      auth.role() = 'service_role'
      or (
        config.tenant_id = public.current_tenant_id()
        and public.is_tenant_member(config.tenant_id)
      )
    );
$$;

revoke all on function public.prospecta_can_access_message_bot(uuid)
  from public, anon, authenticated;
revoke all on function public.prospecta_validate_lead_tenant_links()
  from public, anon, authenticated;
revoke all on function public.prospecta_validate_bot_tenant_links()
  from public, anon, authenticated;
revoke all on function public.prospecta_validate_session_tenant_links()
  from public, anon, authenticated;
revoke all on function public.prospecta_validate_message_bot_links()
  from public, anon, authenticated;
revoke all on function public.prospecta_list_message_niches(uuid)
  from public, anon, authenticated;
revoke all on function public.prospecta_request_message_bot_command(
  uuid, text, text
) from public, anon, authenticated;
revoke all on function public.prospecta_claim_message_lead(
  uuid, text, integer
) from public, anon, authenticated;
revoke all on function public.prospecta_finalize_message_delivery(
  bigint, uuid, text, text
) from public, anon, authenticated;
revoke all on function public.prospecta_message_sent_last_hour(uuid)
  from public, anon, authenticated;

grant execute on function public.prospecta_can_access_message_bot(uuid)
  to authenticated, service_role;
grant execute on function public.prospecta_list_message_niches(uuid)
  to authenticated, service_role;
grant execute on function public.prospecta_request_message_bot_command(
  uuid, text, text
) to authenticated, service_role;
grant execute on function public.prospecta_claim_message_lead(
  uuid, text, integer
) to authenticated, service_role;
grant execute on function public.prospecta_finalize_message_delivery(
  bigint, uuid, text, text
) to authenticated, service_role;
grant execute on function public.prospecta_message_sent_last_hour(uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
