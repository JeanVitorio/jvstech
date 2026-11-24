-- LeadFlow - Conferência de capacidade do banco antes de entrar mais cliente.
-- Só consultas: nada aqui grava, altera ou apaga.
-- É uma consulta única: selecione o arquivo inteiro e rode. O resultado vem
-- numa tabela só, com uma linha por informação, agrupada por seção.
--
-- O que cada seção responde:
--   1. Espaço ....... quanto o banco ocupa e quanto é do limite do plano
--   2. Tabelas ...... onde esse espaço está sendo gasto
--   3. Volume ....... empresas, usuários, leads e histórico de hoje
--   4. Projeção ..... peso por empresa e quantas ainda cabem
--   5. Clientes ..... quem tem mais leads
--   6. Memória ...... se o banco responde da memória ou vai ao disco
--   7. Varreduras ... tabelas lidas inteiras por falta de índice
--   8. Conexões ..... conexões abertas contra o limite do servidor
--   9. Lixo ......... histórico antigo que dá para limpar

with espaco as (
  select pg_database_size(current_database())::numeric as bytes
),
empresas as (
  select greatest(count(*), 1)::numeric as total from public.tenants
),
tabelas as (
  select
    c.relname::text as nome,
    pg_total_relation_size(c.oid) as total_bytes,
    pg_relation_size(c.oid) as dados_bytes,
    c.reltuples::bigint as linhas,
    row_number() over (order by pg_total_relation_size(c.oid) desc) as pos
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
),
clientes as (
  select
    tenant.name::text as nome,
    count(lead.id) as leads,
    row_number() over (order by count(lead.id) desc) as pos
  from public.tenants tenant
  left join public.leads lead on lead.tenant_id = tenant.id
  group by tenant.name
),
varreduras as (
  select
    relname::text as nome,
    seq_scan,
    idx_scan,
    n_live_tup,
    row_number() over (order by seq_scan * greatest(n_live_tup, 1) desc) as pos
  from pg_stat_user_tables
  where seq_scan > 0
)
select secao, item, valor
from (
  -- 1. Espaço ocupado
  select 1 as ordem, 1 as sub, '1. Espaco' as secao,
         'Tamanho do banco' as item,
         pg_size_pretty(bytes::bigint) as valor
  from espaco
  union all
  select 1, 2, '1. Espaco', 'Porcentagem do plano Free (500 MB)',
         round(bytes / (500.0 * 1024 * 1024) * 100, 1)::text || ' %'
  from espaco
  union all
  select 1, 3, '1. Espaco', 'Porcentagem do plano Pro (8 GB)',
         round(bytes / (8.0 * 1024 * 1024 * 1024) * 100, 1)::text || ' %'
  from espaco

  -- 2. Maiores tabelas
  union all
  select 2, pos::int, '2. Tabelas',
         lpad(pos::text, 2, '0') || '. ' || nome,
         pg_size_pretty(total_bytes)
           || ' (dados ' || pg_size_pretty(dados_bytes)
           || ', indices ' || pg_size_pretty(total_bytes - dados_bytes)
           || ', ' || linhas || ' linhas)'
  from tabelas
  where pos <= 10

  -- 3. Volume do negócio
  union all
  select 3, 1, '3. Volume', 'Empresas',
         (select count(*) from public.tenants)::text
  union all
  select 3, 2, '3. Volume', 'Usuarios',
         (select count(*) from public.profiles)::text
  union all
  select 3, 3, '3. Volume', 'Leads',
         (select count(*) from public.leads)::text
  union all
  select 3, 4, '3. Volume', 'Agentes ativos',
         (select count(*) from public.prospecta_bot_configs
           where deleted_at is null)::text
  union all
  select 3, 5, '3. Volume', 'Lotes importados',
         (select count(*) from public.prospecta_lead_import_batches)::text
  union all
  select 3, 6, '3. Volume', 'Eventos dos agentes',
         (select count(*) from public.prospecta_bot_events)::text
  union all
  select 3, 7, '3. Volume', 'Logs do app',
         (select count(*) from public.prospecta_app_logs)::text

  -- 4. Projeção de capacidade
  union all
  select 4, 1, '4. Projecao', 'Media por empresa',
         pg_size_pretty((espaco.bytes / empresas.total)::bigint)
  from espaco, empresas
  union all
  select 4, 2, '4. Projecao', 'Empresas que ainda cabem no Free',
         floor(((500.0 * 1024 * 1024) - espaco.bytes)
               / greatest(espaco.bytes / empresas.total, 1))::text
  from espaco, empresas
  union all
  select 4, 3, '4. Projecao', 'Empresas que ainda cabem no Pro',
         floor(((8.0 * 1024 * 1024 * 1024) - espaco.bytes)
               / greatest(espaco.bytes / empresas.total, 1))::text
  from espaco, empresas

  -- 5. Leads por cliente
  union all
  select 5, pos::int, '5. Clientes',
         lpad(pos::text, 2, '0') || '. ' || nome,
         leads::text || ' lead(s)'
  from clientes
  where pos <= 10

  -- 6. Pressão de leitura
  union all
  select 6, 1, '6. Memoria', 'Servido pela memoria (saudavel acima de 99%)',
         coalesce(
           round(
             sum(heap_blks_hit) * 100.0
               / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0),
             2
           )::text,
           'sem leitura registrada'
         ) || ' %'
  from pg_statio_user_tables

  -- 7. Varreduras sequenciais
  union all
  select 7, pos::int, '7. Varreduras',
         lpad(pos::text, 2, '0') || '. ' || nome,
         seq_scan::text || ' leitura(s) inteira(s), '
           || coalesce(idx_scan, 0)::text || ' por indice, '
           || n_live_tup::text || ' linhas'
  from varreduras
  where pos <= 10

  -- 8. Conexões
  union all
  select 8, 1, '8. Conexoes', 'Conexoes abertas',
         (select count(*) from pg_stat_activity)::text
  union all
  select 8, 2, '8. Conexoes', 'Conexoes ativas agora',
         (select count(*) from pg_stat_activity where state = 'active')::text
  union all
  select 8, 3, '8. Conexoes', 'Limite do servidor',
         current_setting('max_connections')

  -- 9. Histórico que dá para limpar
  union all
  select 9, 1, '9. Lixo', 'Eventos com mais de 30 dias',
         (select count(*) from public.prospecta_bot_events
           where created_at < now() - interval '30 days')::text
  union all
  select 9, 2, '9. Lixo', 'Logs fora da retencao (15 dias)',
         (select count(*) from public.prospecta_app_logs
           where created_at < now() - interval '15 days')::text
  union all
  select 9, 3, '9. Lixo', 'Lotes com mais de 90 dias',
         (select count(*) from public.prospecta_lead_import_batches
           where created_at < now() - interval '90 days')::text
) relatorio
order by ordem, sub;
