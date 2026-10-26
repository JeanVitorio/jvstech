-- LeadFlow - Exclusão da conta da empresa (direito do titular, LGPD art. 18).
-- Chamada só pela edge function delete-account (service role), depois de
-- confirmar a senha do dono. Apaga a empresa e tudo ligado a ela; os logins
-- dos usuários são removidos em seguida pela própria edge function.

begin;

create or replace function public.prospecta_delete_tenant_account(
  p_tenant_id uuid
)
returns uuid[]
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_slug text;
  v_users uuid[];
  v_table text;
begin
  select slug into v_slug
  from public.tenants
  where id = p_tenant_id
  for update;
  if not found then
    return array[]::uuid[];
  end if;
  -- A empresa original guarda também os dados do sistema de Gestão.
  if v_slug = 'jvs-leadflow' then
    raise exception 'A conta principal da JVS não pode ser excluída';
  end if;

  select coalesce(array_agg(user_id), array[]::uuid[])
  into v_users
  from public.tenant_memberships
  where tenant_id = p_tenant_id;

  -- Os agentes de mensagem prendem as sessões do WhatsApp com "on delete
  -- restrict": eles saem primeiro para a cascata da empresa não travar.
  foreach v_table in array array[
    'prospecta_message_deliveries',
    'prospecta_message_bot_controls',
    'prospecta_message_bot_runtime',
    'prospecta_message_bot_configs',
    'prospecta_whatsapp_sessions'
  ]
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format('delete from public.%I where tenant_id = $1', v_table)
      using p_tenant_id;
    end if;
  end loop;

  -- O restante (leads, agentes, assinatura, consumo, logs...) sai em cascata.
  delete from public.tenants where id = p_tenant_id;

  return v_users;
end;
$$;

revoke all on function public.prospecta_delete_tenant_account(uuid)
  from public, anon, authenticated;
grant execute on function public.prospecta_delete_tenant_account(uuid)
  to service_role;

commit;

-- Conferência: deve retornar 1.
select count(*) as funcao_exclusao
from pg_proc
where proname = 'prospecta_delete_tenant_account';
