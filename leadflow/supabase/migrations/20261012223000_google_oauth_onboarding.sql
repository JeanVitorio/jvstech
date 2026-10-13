begin;

create or replace function public.prospecta_complete_oauth_onboarding(
  p_company_name text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  tenant_id_value uuid;
  company_name_value text;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;

  company_name_value := nullif(btrim(p_company_name), '');
  if company_name_value is null
     or char_length(company_name_value) < 2
     or char_length(company_name_value) > 120 then
    raise exception 'Nome da empresa deve ter entre 2 e 120 caracteres';
  end if;

  tenant_id_value := public.current_tenant_id();
  if tenant_id_value is null then
    raise exception 'Empresa não vinculada ao usuário';
  end if;

  if not exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = tenant_id_value
      and membership.user_id = auth.uid()
      and membership.accepted_at is not null
      and membership.role = 'owner'
  ) then
    raise exception 'Apenas o proprietário pode concluir este cadastro';
  end if;

  update public.tenants
  set name = company_name_value,
      updated_at = clock_timestamp()
  where id = tenant_id_value;

  update public.profiles profile
  set name = coalesce(
        nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(auth_user.raw_user_meta_data ->> 'name'), ''),
        profile.name
      ),
      updated_at = clock_timestamp()
  from auth.users auth_user
  where profile.id = auth.uid()
    and auth_user.id = profile.id;

  return tenant_id_value;
end;
$$;

revoke all on function public.prospecta_complete_oauth_onboarding(text)
  from public, anon;
grant execute on function public.prospecta_complete_oauth_onboarding(text)
  to authenticated;

notify pgrst, 'reload schema';

commit;
