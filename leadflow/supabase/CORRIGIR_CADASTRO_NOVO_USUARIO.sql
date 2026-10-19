begin;

-- Corrige o cadastro público sem alterar os valores existentes do enum
-- kanban_base. A classificação "base" é opcional; os IDs das colunas
-- continuam sendo todo, in_progress, review e done.
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
    select 1
    from public.tenants
    where id = tenant_id_from_invite
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

notify pgrst, 'reload schema';

commit;
