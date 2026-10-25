-- Prospecta Flow - Remove a validação de números pelo WhatsApp.
-- Os agentes de prospecção não conferem mais se o número tem WhatsApp, então
-- o cliente não precisa conectar nenhum WhatsApp (evita bloqueios do número).
-- As sessões "message" dos agentes de mensagem continuam como estão.
-- Requer 20261023090000_whatsapp_validation_sessions.sql aplicada antes.

begin;

-- Desativa as sessões de validação existentes; o PC encerra o login localmente.
update public.prospecta_whatsapp_sessions
set deleted_at = clock_timestamp(),
    status = 'disconnected',
    qr_code_data_url = null,
    qr_generated_at = null
where purpose = 'validation'
  and deleted_at is null;

drop function if exists public.prospecta_request_whatsapp_validation(text);
drop function if exists public.prospecta_disconnect_whatsapp_validation(uuid);

-- Novas sessões voltam a ser exclusivas do usuário autorizado; só o
-- encerramento de sessões antigas de validação continua permitido.
create or replace function public.prospecta_validate_whatsapp_provider()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE'
     and old.purpose = 'validation'
     and new.purpose = 'validation' then
    return new;
  end if;

  if not public.prospecta_can_use_message_bots() then
    raise exception
      'Agentes de WhatsApp estão disponíveis somente para o usuário autorizado';
  end if;
  return new;
end;
$$;

revoke all on function public.prospecta_validate_whatsapp_provider()
  from public, anon, authenticated;

commit;

-- Conferência: deve retornar 0 sessões de validação ativas e nenhuma função.
select
  (select count(*) from public.prospecta_whatsapp_sessions
    where purpose = 'validation' and deleted_at is null) as sessoes_validacao_ativas,
  (select count(*) from pg_proc
    where proname in (
      'prospecta_request_whatsapp_validation',
      'prospecta_disconnect_whatsapp_validation'
    )) as funcoes_validacao;
