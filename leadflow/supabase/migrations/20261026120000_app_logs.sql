-- LeadFlow - Logs do app de computador salvos no banco para consulta do suporte.
-- O app envia lotes pela RPC; ninguém grava direto na tabela.
-- Retenção: 15 dias. Limite: 20 mil linhas por empresa a cada 24 horas.

begin;

create table if not exists public.prospecta_app_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  runner_id text,
  app_version text,
  level text not null
    check (level in ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  logger text,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists prospecta_app_logs_tenant_created_idx
  on public.prospecta_app_logs (tenant_id, created_at desc);
create index if not exists prospecta_app_logs_created_idx
  on public.prospecta_app_logs (created_at);

alter table public.prospecta_app_logs enable row level security;
revoke all on public.prospecta_app_logs from public, anon, authenticated;
grant select on public.prospecta_app_logs to authenticated;

-- Dono e administradores da empresa podem ler os logs dos PCs da empresa.
drop policy if exists prospecta_app_logs_select on public.prospecta_app_logs;
create policy prospecta_app_logs_select
on public.prospecta_app_logs
for select
to authenticated
using (public.can_manage_tenant(tenant_id));

create or replace function public.prospecta_register_app_logs(
  p_runner_id text,
  p_app_version text,
  p_entries jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant_id uuid := public.current_tenant_id();
  v_total integer;
begin
  if v_user_id is null or v_tenant_id is null then
    return 0;
  end if;
  if jsonb_typeof(p_entries) is distinct from 'array' then
    raise exception 'Lote de logs inválido';
  end if;

  if (
    select count(*)
    from public.prospecta_app_logs
    where tenant_id = v_tenant_id
      and created_at > now() - interval '1 day'
  ) >= 20000 then
    return 0;
  end if;

  insert into public.prospecta_app_logs (
    tenant_id, user_id, runner_id, app_version, level, logger, message, created_at
  )
  select
    v_tenant_id,
    v_user_id,
    left(nullif(btrim(p_runner_id), ''), 200),
    left(nullif(btrim(p_app_version), ''), 20),
    upper(entry ->> 'level'),
    left(entry ->> 'logger', 120),
    left(entry ->> 'message', 4000),
    case
      when entry ->> 'created_at' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}'
        then least(
          now(),
          greatest(now() - interval '2 days', (entry ->> 'created_at')::timestamptz)
        )
      else now()
    end
  from jsonb_array_elements(p_entries) with ordinality as lote(entry, posicao)
  where posicao <= 100
    and upper(entry ->> 'level') in ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')
    and coalesce(btrim(entry ->> 'message'), '') <> '';
  get diagnostics v_total = row_count;

  -- Limpeza ocasional dos logs antigos de todas as empresas.
  if random() < 0.02 then
    delete from public.prospecta_app_logs
    where created_at < now() - interval '15 days';
  end if;

  return v_total;
end;
$$;

revoke all on function public.prospecta_register_app_logs(text, text, jsonb)
  from public, anon;
grant execute on function public.prospecta_register_app_logs(text, text, jsonb)
  to authenticated;

commit;

-- Conferência: deve retornar a tabela e a função criadas.
select
  to_regclass('public.prospecta_app_logs') as tabela_logs,
  (select count(*) from pg_proc where proname = 'prospecta_register_app_logs') as funcao_logs;
