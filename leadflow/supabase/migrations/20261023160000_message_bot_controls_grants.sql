-- Prospecta Flow - leitura dos comandos dos agentes de WhatsApp pelo app.
-- O app desktop consulta prospecta_message_bot_controls a cada ciclo, mas a
-- tabela nunca recebeu permissão para usuários logados (403 / 42501). O erro
-- interrompia o ciclo e o QR Code do WhatsApp de validação não era gerado.
-- O RLS (prospecta_message_bot_controls_tenant_write) continua limitando as
-- linhas à empresa do usuário; novos comandos seguem só pela RPC.

begin;

alter table public.prospecta_message_bot_controls enable row level security;

grant select on table public.prospecta_message_bot_controls to authenticated;
-- O app só marca o comando como recebido.
grant update (acknowledged_at)
  on table public.prospecta_message_bot_controls to authenticated;

notify pgrst, 'reload schema';

commit;

-- Conferência: permissões e política RLS da tabela.
select
  (select string_agg(privilege_type, ', ' order by privilege_type)
   from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name = 'prospecta_message_bot_controls'
     and grantee = 'authenticated') as permissoes_tabela,
  (select string_agg(policyname, ', ')
   from pg_policies
   where schemaname = 'public'
     and tablename = 'prospecta_message_bot_controls') as politicas_rls;
