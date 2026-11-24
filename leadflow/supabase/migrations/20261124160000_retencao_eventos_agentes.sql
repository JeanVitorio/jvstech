-- LeadFlow - Retenção dos eventos dos agentes de prospecção.
-- A tabela prospecta_bot_events só crescia. A web mostra no máximo os 50
-- eventos mais recentes de cada agente, então histórico antigo é peso morto.
-- Passamos a guardar 30 dias. A limpeza acontece de carona em 2% das
-- gravações, o mesmo padrão já usado nos logs do app, sem depender de
-- agendador nem de extensão.
-- Nada de dado de cliente é afetado: leads, lotes e configurações continuam.

begin;

-- Sem este índice a limpeza varreria a tabela inteira a cada vez.
create index if not exists prospecta_bot_events_created_idx
  on public.prospecta_bot_events (created_at);

create or replace function public.prospecta_limpar_eventos_antigos()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Uma em cada cinquenta gravações faz a faxina; as outras passam direto.
  if random() < 0.02 then
    delete from public.prospecta_bot_events
    where created_at < now() - interval '30 days';
  end if;
  return null;
end;
$$;

revoke all on function public.prospecta_limpar_eventos_antigos() from public, anon;

drop trigger if exists prospecta_bot_events_retencao
  on public.prospecta_bot_events;

create trigger prospecta_bot_events_retencao
after insert on public.prospecta_bot_events
for each statement
execute function public.prospecta_limpar_eventos_antigos();

-- Faxina do que já está acumulado hoje.
delete from public.prospecta_bot_events
where created_at < now() - interval '30 days';

commit;

-- Conferência: deve sobrar apenas o histórico dos últimos 30 dias.
select
  count(*) as eventos_restantes,
  min(created_at) as evento_mais_antigo,
  max(created_at) as evento_mais_recente
from public.prospecta_bot_events;
