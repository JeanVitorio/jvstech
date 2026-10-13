begin;

-- Impede que um lead seja atribuído a um usuário de outra empresa.
create or replace function public.prospecta_validate_lead_owner_tenant()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.owner_id is null then
    return new;
  end if;

  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;

  if new.tenant_id is null or not exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = new.tenant_id
      and membership.user_id = new.owner_id
      and membership.accepted_at is not null
  ) then
    raise exception 'O responsável selecionado não pertence a esta empresa';
  end if;

  return new;
end;
$$;

-- Remove somente atribuições antigas inválidas antes de ativar a trava.
update public.leads lead
set owner_id = null,
    updated_at = clock_timestamp()
where lead.owner_id is not null
  and not exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = lead.tenant_id
      and membership.user_id = lead.owner_id
      and membership.accepted_at is not null
  );

drop trigger if exists zz_leads_validate_owner_tenant on public.leads;
create trigger zz_leads_validate_owner_tenant
before insert or update of tenant_id, owner_id
on public.leads
for each row
execute function public.prospecta_validate_lead_owner_tenant();

-- Altera o nível de um usuário somente dentro da empresa ativa do administrador.
create or replace function public.prospecta_change_tenant_member_role(
  p_user_id uuid,
  p_role public.tenant_role
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  tenant_id_value uuid;
  target_role public.tenant_role;
  legacy_role public.app_role;
begin
  tenant_id_value := public.current_tenant_id();

  if tenant_id_value is null
     or not public.can_manage_tenant(tenant_id_value) then
    raise exception 'Apenas proprietários ou administradores podem alterar usuários';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Você não pode alterar o próprio nível de acesso';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'O nível informado deve ser admin ou member';
  end if;

  select membership.role
  into target_role
  from public.tenant_memberships membership
  where membership.tenant_id = tenant_id_value
    and membership.user_id = p_user_id
    and membership.accepted_at is not null
  for update;

  if not found then
    raise exception 'Usuário não pertence à sua empresa';
  end if;

  if target_role = 'owner' then
    raise exception 'O proprietário da empresa não pode ter o nível alterado';
  end if;

  update public.tenant_memberships
  set role = p_role
  where tenant_id = tenant_id_value
    and user_id = p_user_id;

  legacy_role := case
    when p_role = 'admin' then 'manager'::public.app_role
    else 'collaborator'::public.app_role
  end;

  delete from public.user_roles
  where user_id = p_user_id;

  insert into public.user_roles (user_id, role)
  values (p_user_id, legacy_role);
end;
$$;

revoke all on function public.prospecta_validate_lead_owner_tenant()
  from public, anon, authenticated;
revoke all on function public.prospecta_change_tenant_member_role(
  uuid, public.tenant_role
) from public, anon;
grant execute on function public.prospecta_change_tenant_member_role(
  uuid, public.tenant_role
) to authenticated;

notify pgrst, 'reload schema';

commit;
