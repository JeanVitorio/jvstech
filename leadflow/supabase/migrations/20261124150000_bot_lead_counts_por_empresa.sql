-- Prospecta Flow - contagem de leads por agente restrita à empresa do usuário.
-- A versão anterior varria os lotes de todas as empresas e só então filtrava
-- com is_tenant_member, função chamada linha a linha. Com muitos clientes isso
-- cresce sem necessidade. Aqui a empresa entra como filtro, usando o índice
-- prospecta_lead_import_batches (tenant_id, bot_id).
-- Nada muda para quem usa: o retorno é o mesmo (bot_id, generated_leads).

begin;

create or replace function public.prospecta_get_bot_lead_counts()
returns table (bot_id uuid, generated_leads bigint)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    batch.bot_id,
    coalesce(sum((batch.result ->> 'inserted')::integer), 0)::bigint
  from public.prospecta_lead_import_batches batch
  join public.prospecta_bot_configs config
    on config.id = batch.bot_id
   and config.tenant_id = batch.tenant_id
   and config.deleted_at is null
  where batch.tenant_id = public.current_tenant_id()
  group by batch.bot_id;
$$;

revoke all on function public.prospecta_get_bot_lead_counts()
  from public, anon;
grant execute on function public.prospecta_get_bot_lead_counts()
  to authenticated;

notify pgrst, 'reload schema';

commit;
