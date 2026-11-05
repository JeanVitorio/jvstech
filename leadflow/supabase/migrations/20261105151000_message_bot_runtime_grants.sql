-- LeadFlow - Permite ao app gravar o andamento dos agentes de WhatsApp.
-- A tabela só tinha permissão para service_role: o app (usuário logado) recebia
-- "permission denied for table prospecta_message_bot_runtime" (42501) e o agente
-- de mensagens encerrava por falha a cada tentativa.
-- O RLS continua limitando as linhas à empresa do usuário.
--
-- Antes de rodar, feche o app LeadFlow no PC. O agente de mensagens escreve
-- nesta tabela a cada poucos segundos e segura a trava que estes comandos pedem.
-- Se mesmo assim travar, rode a consulta do rodapé para ver quem está segurando.

begin;

-- Falha em 10 segundos com mensagem clara, em vez de derrubar a conexão.
set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- O "enable row level security" pede a trava mais pesada da tabela; as
-- migrations anteriores já ligaram o RLS, então só mexe se estiver desligado.
do $$
begin
  if not exists (
    select 1
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'prospecta_message_bot_runtime'
      and pg_class.relrowsecurity
  ) then
    alter table public.prospecta_message_bot_runtime enable row level security;
  end if;
end;
$$;

grant select, insert, update on table public.prospecta_message_bot_runtime
  to authenticated;

-- Linhas criadas antes da separação por empresa ficariam fora do RLS e o app
-- nunca conseguiria atualizá-las.
update public.prospecta_message_bot_runtime runtime
set tenant_id = config.tenant_id
from public.prospecta_message_bot_configs config
where config.id = runtime.bot_id
  and runtime.tenant_id is null
  and config.tenant_id is not null;

drop policy if exists prospecta_message_runtime_tenant_insert
  on public.prospecta_message_bot_runtime;
create policy prospecta_message_runtime_tenant_insert
on public.prospecta_message_bot_runtime
for insert
to authenticated
with check (tenant_id = public.current_tenant_id());

drop policy if exists prospecta_message_runtime_tenant_update
  on public.prospecta_message_bot_runtime;
create policy prospecta_message_runtime_tenant_update
on public.prospecta_message_bot_runtime
for update
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

notify pgrst, 'reload schema';

commit;

-- Conferência: permissões e políticas da tabela.
select
  (select string_agg(privilege_type, ', ' order by privilege_type)
   from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name = 'prospecta_message_bot_runtime'
     and grantee = 'authenticated') as permissoes_tabela,
  (select string_agg(policyname, ', ' order by policyname)
   from pg_policies
   where schemaname = 'public'
     and tablename = 'prospecta_message_bot_runtime') as politicas_rls;

-- Se der "lock timeout", rode isto para ver quem está segurando a tabela.
-- Depois encerre a conexão travada com: select pg_terminate_backend(<pid>);
-- select pid,
--        state,
--        now() - xact_start as tempo_na_transacao,
--        left(query, 120) as consulta
-- from pg_stat_activity
-- where pid <> pg_backend_pid()
--   and (query ilike '%prospecta_message_bot_runtime%'
--        or state = 'idle in transaction')
-- order by xact_start;
