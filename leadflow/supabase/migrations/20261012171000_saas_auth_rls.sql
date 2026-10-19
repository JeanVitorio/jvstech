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
        'bg-muted-foreground', 0, null
      ),
      (
        new_tenant_id, 'in_progress', 'Em Andamento',
        'bg-primary', 1, null
      ),
      (
        new_tenant_id, 'review', 'Em Revisão',
        'bg-warning', 2, null
      ),
      (
        new_tenant_id, 'done', 'Concluído',
        'bg-success', 3, null
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
