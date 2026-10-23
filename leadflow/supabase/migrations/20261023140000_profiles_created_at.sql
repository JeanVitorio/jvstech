-- Prospecta Flow - data e horário de criação da conta.
-- profiles.created_at passa a ser sempre o instante real do cadastro
-- (auth.users.created_at), inclusive nos perfis antigos criados em lote,
-- e não pode mais ser alterado depois.

begin;

create or replace function public.prospecta_profile_account_created_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  account_created_at timestamptz;
begin
  select users.created_at into account_created_at
  from auth.users users
  where users.id = new.id;

  new.created_at := coalesce(
    account_created_at,
    case when tg_op = 'UPDATE' then old.created_at end,
    new.created_at,
    now()
  );
  return new;
end;
$$;

revoke all on function public.prospecta_profile_account_created_at()
  from public, anon, authenticated;

drop trigger if exists prospecta_profiles_account_created_at on public.profiles;
create trigger prospecta_profiles_account_created_at
  before insert or update of created_at on public.profiles
  for each row
  execute function public.prospecta_profile_account_created_at();

-- Corrige os perfis existentes com a data real do cadastro.
update public.profiles profile
set created_at = users.created_at
from auth.users users
where users.id = profile.id
  and profile.created_at is distinct from users.created_at;

commit;

-- Conferência: created_at do perfil igual ao do cadastro em todas as contas.
select
  profile.email,
  to_char(
    profile.created_at at time zone 'America/Sao_Paulo',
    'DD/MM/YYYY HH24:MI:SS'
  ) as conta_criada_em_brasilia,
  profile.created_at = users.created_at as confere
from public.profiles profile
join auth.users users on users.id = profile.id
order by profile.created_at;
