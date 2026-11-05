-- LeadFlow - Permite ao app gravar o andamento dos agentes de WhatsApp.
-- A tabela só tinha permissão para service_role: o app (usuário logado) recebia
-- "permission denied for table prospecta_message_bot_runtime" (42501) e o agente
-- de mensagens encerrava por falha a cada tentativa.
-- O RLS continua limitando as linhas à empresa do usuário.

begin;

alter table public.prospecta_message_bot_runtime enable row level security;

grant select, insert, update on table public.prospecta_message_bot_runtime
  to authenticated;

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
