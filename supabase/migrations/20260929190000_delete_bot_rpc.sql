create or replace function public.prospecta_delete_bot(
  p_bot_id uuid,
  p_expected_version bigint
)
returns setof public.prospecta_bot_configs
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.prospecta_can_access_bot(p_bot_id) then
    raise exception 'Acesso negado ao bot';
  end if;

  return query
  update public.prospecta_bot_configs
  set deleted_at = clock_timestamp()
  where id = p_bot_id
    and version = p_expected_version
    and deleted_at is null
  returning prospecta_bot_configs.*;
end;
$$;

revoke all on function public.prospecta_delete_bot(uuid, bigint)
  from public, anon, authenticated;

grant execute on function public.prospecta_delete_bot(uuid, bigint)
  to authenticated, service_role;
