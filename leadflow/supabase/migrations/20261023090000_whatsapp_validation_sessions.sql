-- Prospecta Flow - WhatsApp de validação para todos os usuários.
-- Os agentes de prospecção conferem se o número do lead tem WhatsApp usando
-- uma sessão "validation" por PC (executor). Ela só consulta números e nunca
-- envia mensagens; as sessões "message" continuam restritas aos agentes de
-- mensagem do usuário autorizado.
-- Requer 20261022150000_remove_whatsapp_meta_cloud.sql aplicada antes.

begin;

do $$
begin
  if to_regprocedure('public.prospecta_validate_whatsapp_provider()') is null
     or to_regclass('public.prospecta_bot_runners') is null then
    raise exception
      'Aplique antes a migration 20261022150000_remove_whatsapp_meta_cloud.sql.';
  end if;
end;
$$;

alter table public.prospecta_whatsapp_sessions
  add column if not exists purpose text not null default 'message';

alter table public.prospecta_whatsapp_sessions
  drop constraint if exists prospecta_whatsapp_sessions_purpose_valid;
alter table public.prospecta_whatsapp_sessions
  add constraint prospecta_whatsapp_sessions_purpose_valid
  check (purpose in ('message', 'validation'));

-- Uma sessão de validação ativa por PC em cada empresa.
create unique index if not exists prospecta_whatsapp_sessions_validation_runner_uidx
  on public.prospecta_whatsapp_sessions (tenant_id, runner_id)
  where purpose = 'validation' and deleted_at is null;

-- Sessões de validação ficam liberadas para todos; as de mensagem seguem restritas.
create or replace function public.prospecta_validate_whatsapp_provider()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.purpose = 'validation'
     and (tg_op = 'INSERT' or old.purpose = 'validation') then
    return new;
  end if;

  if not public.prospecta_can_use_message_bots() then
    raise exception
      'Agentes de WhatsApp estão disponíveis somente para o usuário autorizado';
  end if;
  return new;
end;
$$;

-- Cria a sessão de validação de um PC da empresa ou pede uma nova conexão.
create or replace function public.prospecta_request_whatsapp_validation(
  p_runner_id text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_runner_name text;
  v_session_id uuid;
begin
  if auth.uid() is null
     or v_tenant_id is null
     or not public.is_tenant_member(v_tenant_id) then
    raise exception 'Acesso negado';
  end if;

  select runner.name
    into v_runner_name
  from public.prospecta_bot_runners runner
  where runner.id = p_runner_id
    and runner.tenant_id = v_tenant_id;
  if not found then
    raise exception 'PC não encontrado para esta empresa';
  end if;

  select session.id
    into v_session_id
  from public.prospecta_whatsapp_sessions session
  where session.tenant_id = v_tenant_id
    and session.runner_id = p_runner_id
    and session.purpose = 'validation'
    and session.deleted_at is null
  for update;

  if v_session_id is null then
    insert into public.prospecta_whatsapp_sessions (
      name, owner_id, runner_id, purpose, provider, status, tenant_id
    )
    values (
      left('Validação · ' || coalesce(v_runner_name, p_runner_id), 120),
      auth.uid(),
      p_runner_id,
      'validation',
      'whatsapp_web',
      'connecting',
      v_tenant_id
    )
    returning id into v_session_id;
  else
    update public.prospecta_whatsapp_sessions
    set status = 'connecting',
        last_error = null,
        qr_code_data_url = null,
        qr_generated_at = null
    where id = v_session_id
      and status <> 'ready';
  end if;

  return v_session_id;
end;
$$;

-- Remove a sessão de validação; o PC encerra o login salvo na próxima sincronização.
create or replace function public.prospecta_disconnect_whatsapp_validation(
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null
     or not public.is_tenant_member(public.current_tenant_id()) then
    raise exception 'Acesso negado';
  end if;

  update public.prospecta_whatsapp_sessions
  set deleted_at = clock_timestamp(),
      status = 'disconnected',
      qr_code_data_url = null,
      qr_generated_at = null
  where id = p_session_id
    and tenant_id = public.current_tenant_id()
    and purpose = 'validation'
    and deleted_at is null;

  if not found then
    raise exception 'WhatsApp de validação não encontrado';
  end if;
end;
$$;

revoke all on function public.prospecta_validate_whatsapp_provider()
  from public, anon, authenticated;
revoke all on function public.prospecta_request_whatsapp_validation(text)
  from public, anon;
revoke all on function public.prospecta_disconnect_whatsapp_validation(uuid)
  from public, anon;
grant execute on function public.prospecta_request_whatsapp_validation(text)
  to authenticated;
grant execute on function public.prospecta_disconnect_whatsapp_validation(uuid)
  to authenticated;

notify pgrst, 'reload schema';

commit;
