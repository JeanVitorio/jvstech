-- LeadFlow - Amplia a janela que considera o PC disponível para executar agentes.
-- O app avisa que está aberto a cada 30 segundos; com 150 segundos de tolerância
-- uma oscilação de internet não faz o computador sumir da tela de "Iniciar agente".

begin;

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
    and runner.heartbeat_at >= clock_timestamp() - interval '150 seconds'
  order by runner.name;
$$;

revoke all on function public.prospecta_list_runners()
  from public, anon;
grant execute on function public.prospecta_list_runners()
  to authenticated, service_role;

commit;

notify pgrst, 'reload schema';

-- Conferência: lista os PCs que a Web enxerga agora.
select * from public.prospecta_list_runners();
