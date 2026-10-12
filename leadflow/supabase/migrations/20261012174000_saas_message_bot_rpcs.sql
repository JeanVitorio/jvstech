begin;

create or replace function public.prospecta_validate_lead_tenant_links()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  if new.owner_id is not null
     and not public.is_tenant_member(new.tenant_id, new.owner_id) then
    raise exception 'O responsável pelo lead não pertence à empresa';
  end if;
  if new.stage_id is not null
     and not exists (
       select 1
       from public.lead_stages stage
       where stage.id = new.stage_id
         and stage.tenant_id = new.tenant_id
     ) then
    raise exception 'O estágio do lead não pertence à empresa';
  end if;
  return new;
end;
$$;

drop trigger if exists zz_leads_validate_tenant_links on public.leads;
create trigger zz_leads_validate_tenant_links
before insert or update on public.leads
for each row execute function public.prospecta_validate_lead_tenant_links();

create or replace function public.prospecta_validate_bot_tenant_links()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  if new.lead_owner_id is not null
     and not public.is_tenant_member(
       new.tenant_id,
       new.lead_owner_id
     ) then
    raise exception 'O responsável pelo bot não pertence à empresa';
  end if;
  return new;
end;
$$;

drop trigger if exists zz_bot_configs_validate_tenant_links
  on public.prospecta_bot_configs;
create trigger zz_bot_configs_validate_tenant_links
before insert or update on public.prospecta_bot_configs
for each row execute function public.prospecta_validate_bot_tenant_links();

create or replace function public.prospecta_validate_session_tenant_links()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  if not public.is_tenant_member(new.tenant_id, new.owner_id) then
    raise exception 'O responsável pela sessão não pertence à empresa';
  end if;
  return new;
end;
$$;

drop trigger if exists zz_whatsapp_sessions_validate_tenant_links
  on public.prospecta_whatsapp_sessions;
create trigger zz_whatsapp_sessions_validate_tenant_links
before insert or update on public.prospecta_whatsapp_sessions
for each row
execute function public.prospecta_validate_session_tenant_links();

create or replace function public.prospecta_validate_message_bot_links()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  if not public.is_tenant_member(new.tenant_id, new.created_by)
     or not public.is_tenant_member(
       new.tenant_id,
       new.lead_owner_id
     ) then
    raise exception 'Os usuários do bot não pertencem à empresa';
  end if;
  if not exists (
    select 1
    from public.prospecta_whatsapp_sessions session
    where session.id = new.whatsapp_session_id
      and session.tenant_id = new.tenant_id
      and session.deleted_at is null
  ) then
    raise exception 'A sessão do WhatsApp não pertence à empresa';
  end if;
  if not exists (
    select 1
    from public.lead_stages stage
    where stage.id = new.source_stage_id
      and stage.tenant_id = new.tenant_id
  ) or not exists (
    select 1
    from public.lead_stages stage
    where stage.id = new.target_stage_id
      and stage.tenant_id = new.tenant_id
  ) then
    raise exception 'Os estágios do bot não pertencem à empresa';
  end if;
  return new;
end;
$$;

drop trigger if exists zz_message_bot_configs_validate_tenant_links
  on public.prospecta_message_bot_configs;
create trigger zz_message_bot_configs_validate_tenant_links
before insert or update on public.prospecta_message_bot_configs
for each row execute function public.prospecta_validate_message_bot_links();

create or replace function public.prospecta_can_access_message_bot(
  p_bot_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.role() = 'service_role'
    or exists (
      select 1
      from public.prospecta_message_bot_configs config
      where config.id = p_bot_id
        and config.deleted_at is null
        and config.tenant_id = public.current_tenant_id()
        and public.is_tenant_member(config.tenant_id)
    );
$$;

create or replace function public.prospecta_list_message_niches(
  p_owner_id uuid
)
returns table (niche text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select distinct btrim(lead.value) as niche
  from (
    select item.tenant_id, item.owner_id, item.source as value
    from public.leads item
    union all
    select item.tenant_id, item.owner_id, item.niche as value
    from public.leads item
  ) lead
  where lead.owner_id = p_owner_id
    and btrim(coalesce(lead.value, '')) <> ''
    and (
      auth.role() = 'service_role'
      or (
        lead.tenant_id = public.current_tenant_id()
        and public.is_tenant_member(lead.tenant_id)
        and public.is_tenant_member(lead.tenant_id, p_owner_id)
      )
    )
  order by niche;
$$;

create or replace function public.prospecta_request_message_bot_command(
  p_bot_id uuid,
  p_command text,
  p_target_runner_id text default null
)
returns setof public.prospecta_message_bot_controls
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  tenant_id_value uuid;
begin
  if p_command not in ('rodando', 'pausado', 'parado') then
    raise exception 'Comando inválido';
  end if;
  if not public.prospecta_can_access_message_bot(p_bot_id) then
    raise exception 'Acesso negado ao bot de mensagens';
  end if;

  select tenant_id into tenant_id_value
  from public.prospecta_message_bot_configs
  where id = p_bot_id and deleted_at is null;

  if p_command = 'rodando'
     and btrim(coalesce(p_target_runner_id, '')) = '' then
    raise exception 'Executor é obrigatório para iniciar';
  end if;
  if p_command = 'rodando'
     and not exists (
       select 1
       from public.prospecta_bot_runners runner
       where runner.id = p_target_runner_id
         and runner.tenant_id = tenant_id_value
         and runner.status = 'online'
         and runner.heartbeat_at
           >= clock_timestamp() - interval '90 seconds'
     ) then
    raise exception 'Executor indisponível para esta empresa';
  end if;
  if p_command = 'rodando' and exists (
    select 1
    from public.prospecta_message_bot_configs config
    join public.prospecta_whatsapp_sessions session
      on session.id = config.whatsapp_session_id
     and session.tenant_id = config.tenant_id
    where config.id = p_bot_id
      and session.runner_id is not null
      and session.status in ('connecting', 'qr_pending', 'ready')
      and session.last_seen_at >= clock_timestamp() - interval '2 minutes'
      and session.runner_id <> p_target_runner_id
  ) then
    raise exception 'A sessão está conectada em outro executor';
  end if;

  return query
  insert into public.prospecta_message_bot_controls (
    bot_id,
    tenant_id,
    command,
    target_runner_id,
    request_id,
    requested_at,
    acknowledged_at
  )
  values (
    p_bot_id,
    tenant_id_value,
    p_command,
    nullif(btrim(p_target_runner_id), ''),
    gen_random_uuid(),
    clock_timestamp(),
    null
  )
  on conflict (bot_id) do update
  set tenant_id = excluded.tenant_id,
      command = excluded.command,
      target_runner_id = coalesce(
        excluded.target_runner_id,
        prospecta_message_bot_controls.target_runner_id
      ),
      request_id = excluded.request_id,
      requested_at = excluded.requested_at,
      acknowledged_at = null
  returning prospecta_message_bot_controls.*;
end;
$$;

create or replace function public.prospecta_claim_message_lead(
  p_bot_id uuid,
  p_runner_id text,
  p_lease_seconds integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  config_row public.prospecta_message_bot_configs%rowtype;
  delivery_row public.prospecta_message_deliveries%rowtype;
  lead_row public.leads%rowtype;
  phone_value text;
begin
  if btrim(coalesce(p_runner_id, '')) = '' then
    raise exception 'Executor é obrigatório';
  end if;
  if p_lease_seconds < 60 or p_lease_seconds > 3600 then
    raise exception 'Lease inválido';
  end if;

  select * into config_row
  from public.prospecta_message_bot_configs
  where id = p_bot_id and deleted_at is null;

  if not found then
    return null;
  end if;
  if auth.role() <> 'service_role'
     and not public.is_tenant_member(config_row.tenant_id) then
    raise exception 'Acesso negado ao bot de mensagens';
  end if;
  if auth.role() <> 'service_role'
     and not exists (
       select 1
       from public.prospecta_bot_runners runner
       where runner.id = p_runner_id
         and runner.tenant_id = config_row.tenant_id
     ) then
    raise exception 'Executor não pertence à empresa';
  end if;
  if not exists (
    select 1
    from public.prospecta_message_bot_controls control
    where control.bot_id = p_bot_id
      and control.tenant_id = config_row.tenant_id
      and control.command = 'rodando'
      and control.target_runner_id = p_runner_id
  ) then
    return null;
  end if;

  select delivery.* into delivery_row
  from public.prospecta_message_deliveries delivery
  where delivery.bot_id = p_bot_id
    and delivery.tenant_id = config_row.tenant_id
    and delivery.status = 'claimed'
    and delivery.lease_expires_at < clock_timestamp()
  order by delivery.created_at
  for update skip locked
  limit 1;

  if found then
    update public.prospecta_message_deliveries
    set claim_token = gen_random_uuid(),
        claimed_by = p_runner_id,
        lease_expires_at = clock_timestamp()
          + make_interval(secs => p_lease_seconds),
        attempt_count = attempt_count + 1
    where id = delivery_row.id
    returning * into delivery_row;

    select * into lead_row
    from public.leads
    where id = delivery_row.lead_id
      and tenant_id = config_row.tenant_id;

    if not found
       or lead_row.owner_id is distinct from config_row.lead_owner_id
       or not (
         coalesce(lead_row.niche, '') = config_row.niche
         or coalesce(lead_row.source, '') = config_row.niche
       )
       or lead_row.stage_id is distinct from config_row.source_stage_id
       or coalesce(lead_row.whatsapp_do_not_contact, false)
    then
      update public.prospecta_message_deliveries
      set status = 'failed',
          error_code = 'lead_no_longer_eligible',
          lease_expires_at = clock_timestamp()
      where id = delivery_row.id;
      return null;
    end if;
  else
    select lead.* into lead_row
    from public.leads lead
    where lead.tenant_id = config_row.tenant_id
      and lead.owner_id = config_row.lead_owner_id
      and (
        coalesce(lead.niche, '') = config_row.niche
        or coalesce(lead.source, '') = config_row.niche
      )
      and lead.stage_id = config_row.source_stage_id
      and not coalesce(lead.whatsapp_do_not_contact, false)
      and regexp_replace(
        coalesce(nullif(lead.whatsapp, ''), lead.phone, ''),
        '[^0-9]',
        '',
        'g'
      ) <> ''
      and not exists (
        select 1
        from public.prospecta_message_deliveries delivery
        where delivery.bot_id = p_bot_id
          and delivery.lead_id = lead.id
      )
    order by lead.created_at, lead.id
    for update skip locked
    limit 1;

    if not found then
      return null;
    end if;

    phone_value := coalesce(nullif(lead_row.whatsapp, ''), lead_row.phone);
    insert into public.prospecta_message_deliveries (
      bot_id,
      tenant_id,
      lead_id,
      whatsapp_session_id,
      phone_normalized,
      claimed_by,
      lease_expires_at
    )
    values (
      p_bot_id,
      config_row.tenant_id,
      lead_row.id,
      config_row.whatsapp_session_id,
      regexp_replace(phone_value, '[^0-9]', '', 'g'),
      p_runner_id,
      clock_timestamp() + make_interval(secs => p_lease_seconds)
    )
    returning * into delivery_row;
  end if;

  return jsonb_build_object(
    'delivery_id', delivery_row.id,
    'claim_token', delivery_row.claim_token,
    'lead_id', lead_row.id,
    'name', lead_row.name,
    'company', lead_row.company,
    'niche', config_row.niche,
    'phone', coalesce(nullif(lead_row.whatsapp, ''), lead_row.phone)
  );
end;
$$;

create or replace function public.prospecta_finalize_message_delivery(
  p_delivery_id bigint,
  p_claim_token uuid,
  p_status text,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  delivery_row public.prospecta_message_deliveries%rowtype;
  target_stage_id_value uuid;
begin
  if p_status not in ('sent', 'invalid', 'failed') then
    raise exception 'Status final inválido';
  end if;

  select * into delivery_row
  from public.prospecta_message_deliveries
  where id = p_delivery_id
    and claim_token = p_claim_token
    and status = 'claimed'
  for update;

  if not found then
    return false;
  end if;
  if auth.role() <> 'service_role'
     and not public.is_tenant_member(delivery_row.tenant_id) then
    raise exception 'Acesso negado à entrega';
  end if;

  update public.prospecta_message_deliveries
  set status = p_status,
      error_code = left(nullif(p_error_code, ''), 200),
      sent_at = case
        when p_status = 'sent' then clock_timestamp()
        else null
      end,
      lease_expires_at = clock_timestamp()
  where id = p_delivery_id;

  if p_status = 'sent' then
    select target_stage_id into target_stage_id_value
    from public.prospecta_message_bot_configs
    where id = delivery_row.bot_id
      and tenant_id = delivery_row.tenant_id;

    update public.leads
    set stage_id = target_stage_id_value,
        updated_at = clock_timestamp()
    where id = delivery_row.lead_id
      and tenant_id = delivery_row.tenant_id;
  end if;

  insert into public.prospecta_message_bot_runtime (
    bot_id,
    tenant_id,
    sent_count,
    invalid_count,
    failed_count
  )
  values (
    delivery_row.bot_id,
    delivery_row.tenant_id,
    case when p_status = 'sent' then 1 else 0 end,
    case when p_status = 'invalid' then 1 else 0 end,
    case when p_status = 'failed' then 1 else 0 end
  )
  on conflict (bot_id) do update
  set tenant_id = excluded.tenant_id,
      sent_count = prospecta_message_bot_runtime.sent_count
        + case when p_status = 'sent' then 1 else 0 end,
      invalid_count = prospecta_message_bot_runtime.invalid_count
        + case when p_status = 'invalid' then 1 else 0 end,
      failed_count = prospecta_message_bot_runtime.failed_count
        + case when p_status = 'failed' then 1 else 0 end;

  return true;
end;
$$;

create or replace function public.prospecta_message_sent_last_hour(
  p_bot_id uuid
)
returns integer
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select count(*)::integer
  from public.prospecta_message_deliveries delivery
  join public.prospecta_message_bot_configs config
    on config.id = delivery.bot_id
   and config.tenant_id = delivery.tenant_id
  where delivery.bot_id = p_bot_id
    and delivery.status = 'sent'
    and delivery.sent_at >= clock_timestamp() - interval '1 hour'
    and (
      auth.role() = 'service_role'
      or (
        config.tenant_id = public.current_tenant_id()
        and public.is_tenant_member(config.tenant_id)
      )
    );
$$;

revoke all on function public.prospecta_can_access_message_bot(uuid)
  from public, anon, authenticated;
revoke all on function public.prospecta_validate_lead_tenant_links()
  from public, anon, authenticated;
revoke all on function public.prospecta_validate_bot_tenant_links()
  from public, anon, authenticated;
revoke all on function public.prospecta_validate_session_tenant_links()
  from public, anon, authenticated;
revoke all on function public.prospecta_validate_message_bot_links()
  from public, anon, authenticated;
revoke all on function public.prospecta_list_message_niches(uuid)
  from public, anon, authenticated;
revoke all on function public.prospecta_request_message_bot_command(
  uuid, text, text
) from public, anon, authenticated;
revoke all on function public.prospecta_claim_message_lead(
  uuid, text, integer
) from public, anon, authenticated;
revoke all on function public.prospecta_finalize_message_delivery(
  bigint, uuid, text, text
) from public, anon, authenticated;
revoke all on function public.prospecta_message_sent_last_hour(uuid)
  from public, anon, authenticated;

grant execute on function public.prospecta_can_access_message_bot(uuid)
  to authenticated, service_role;
grant execute on function public.prospecta_list_message_niches(uuid)
  to authenticated, service_role;
grant execute on function public.prospecta_request_message_bot_command(
  uuid, text, text
) to authenticated, service_role;
grant execute on function public.prospecta_claim_message_lead(
  uuid, text, integer
) to authenticated, service_role;
grant execute on function public.prospecta_finalize_message_delivery(
  bigint, uuid, text, text
) to authenticated, service_role;
grant execute on function public.prospecta_message_sent_last_hour(uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
