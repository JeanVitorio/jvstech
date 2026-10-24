-- Prospecta Flow - registro do aceite dos Termos de Uso e da Política de Privacidade.
-- Cada aceite guarda usuário, versão dos documentos, data/hora do servidor e
-- origem (cadastro ou aviso no login). Os registros não podem ser alterados
-- nem apagados pelo usuário; a gravação acontece só pela RPC abaixo.

begin;

create table if not exists public.prospecta_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null
    check (terms_version ~ '^\d{4}-\d{2}-\d{2}$'),
  accepted_at timestamptz not null default now(),
  source text not null check (source in ('signup', 'login')),
  user_agent text check (char_length(user_agent) <= 500),
  unique (user_id, terms_version)
);

alter table public.prospecta_terms_acceptances enable row level security;

drop policy if exists prospecta_terms_acceptances_select_own
  on public.prospecta_terms_acceptances;
create policy prospecta_terms_acceptances_select_own
  on public.prospecta_terms_acceptances
  for select to authenticated
  using (user_id = auth.uid());

revoke all on table public.prospecta_terms_acceptances
  from public, anon, authenticated;
grant select on table public.prospecta_terms_acceptances to authenticated;
grant select, insert, update, delete
  on table public.prospecta_terms_acceptances to service_role;

-- Registra o aceite da versão informada para o usuário logado.
-- Conta criada já com essa versão no cadastro: vale a data do cadastro.
create or replace function public.prospecta_accept_terms(
  p_version text,
  p_user_agent text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  signup_version text;
  account_created_at timestamptz;
  acceptance_source text := 'login';
  acceptance_at timestamptz := now();
  saved_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'Sessão expirada' using errcode = '42501';
  end if;
  if p_version is null or p_version !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Versão dos termos inválida' using errcode = '22023';
  end if;

  select users.raw_user_meta_data ->> 'terms_version', users.created_at
    into signup_version, account_created_at
  from auth.users users
  where users.id = current_user_id;

  -- Só contas criadas depois da publicação da versão herdam a data do cadastro.
  if signup_version = p_version
     and account_created_at >= p_version::date then
    acceptance_source := 'signup';
    acceptance_at := account_created_at;
  end if;

  insert into public.prospecta_terms_acceptances (
    user_id, terms_version, accepted_at, source, user_agent
  )
  values (
    current_user_id,
    p_version,
    acceptance_at,
    acceptance_source,
    left(nullif(btrim(p_user_agent), ''), 500)
  )
  on conflict (user_id, terms_version) do nothing;

  select acceptance.accepted_at into saved_at
  from public.prospecta_terms_acceptances acceptance
  where acceptance.user_id = current_user_id
    and acceptance.terms_version = p_version;
  return saved_at;
end;
$$;

revoke all on function public.prospecta_accept_terms(text, text)
  from public, anon;
grant execute on function public.prospecta_accept_terms(text, text)
  to authenticated, service_role;

notify pgrst, 'reload schema';

commit;

-- Conferência: tabela, política RLS e função criadas.
select
  to_regclass('public.prospecta_terms_acceptances') is not null as tabela_criada,
  (select count(*) from pg_policies
   where tablename = 'prospecta_terms_acceptances') as politicas_rls,
  to_regprocedure('public.prospecta_accept_terms(text,text)') is not null as funcao_criada;
