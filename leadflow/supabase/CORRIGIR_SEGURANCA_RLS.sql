-- Correções de segurança do LeadFlow (executar no SQL Editor do Supabase).
-- Pode ser executado mais de uma vez.
begin;

-- 1) Chamadas sem usuário só são confiáveis quando vêm do service_role
--    (ou de sessões internas do banco, como SQL Editor e pg_cron).
--    Evita que um token anônimo seja tratado como acesso total aos bots.
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
        (
          auth.uid() is null
          and coalesce(auth.role(), 'service_role') = 'service_role'
        )
        or public.is_tenant_member(config.tenant_id)
      )
  );
$$;

revoke all on function public.prospecta_can_access_bot(uuid)
  from public, anon, authenticated;
grant execute on function public.prospecta_can_access_bot(uuid)
  to authenticated, service_role;

-- 2) Cota ilimitada apenas para a conta administrativa com e-mail confirmado.
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
      and account.email_confirmed_at is not null
      and lower(account.email) = 'jeanadmin@jvs.com.br'
  );
$$;

revoke all on function public.prospecta_user_has_unlimited_leads()
  from public, anon, authenticated;
grant execute on function public.prospecta_user_has_unlimited_leads()
  to authenticated, service_role;

-- 3) Usuário só pode apontar o perfil para uma empresa da qual é membro.
--    Validação apenas quando o campo muda, para não travar edições de perfil.
create or replace function public.prospecta_protect_active_tenant()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(auth.role(), 'service_role') = 'service_role' then
    return new;
  end if;
  if new.active_tenant_id is distinct from old.active_tenant_id
     and new.active_tenant_id is not null
     and not public.is_tenant_member(new.active_tenant_id, new.id) then
    raise exception 'Empresa ativa inválida para este usuário';
  end if;
  return new;
end;
$$;

revoke all on function public.prospecta_protect_active_tenant()
  from public, anon, authenticated;

drop trigger if exists profiles_protect_active_tenant on public.profiles;
create trigger profiles_protect_active_tenant
before update of active_tenant_id on public.profiles
for each row
execute function public.prospecta_protect_active_tenant();

notify pgrst, 'reload schema';

commit;

-- Conferência: deve retornar 1 linha com email_confirmado = true.
select
  lower(email) as email,
  email_confirmed_at is not null as email_confirmado
from auth.users
where lower(email) = 'jeanadmin@jvs.com.br';
