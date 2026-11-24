-- LeadFlow - Conferência de capacidade do banco antes de entrar mais cliente.
-- Só consultas: nada aqui grava, altera ou apaga. Rode no SQL Editor do Supabase
-- e leia bloco a bloco. O que cada número significa está no comentário acima dele.

-- =====================================================================
-- 1. Espaço: quanto o banco já ocupa do limite do plano
--    Free = 500 MB | Pro = 8 GB (confirme em Settings > Usage)
-- =====================================================================
select
  pg_size_pretty(pg_database_size(current_database())) as tamanho_do_banco,
  round(
    pg_database_size(current_database()) / (500.0 * 1024 * 1024) * 100,
    1
  ) as porcentagem_do_plano_free;

-- =====================================================================
-- 2. Onde o espaço está sendo gasto (as 15 maiores tabelas, com índices)
--    Serve para saber o que limpar se o espaço apertar.
-- =====================================================================
select
  relname as tabela,
  pg_size_pretty(pg_total_relation_size(c.oid)) as tamanho_total,
  pg_size_pretty(pg_relation_size(c.oid)) as dados,
  pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) as indices,
  c.reltuples::bigint as linhas_estimadas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by pg_total_relation_size(c.oid) desc
limit 15;

-- =====================================================================
-- 3. Volume do negócio hoje: empresas, usuários e leads
-- =====================================================================
select
  (select count(*) from public.tenants) as empresas,
  (select count(*) from public.profiles) as usuarios,
  (select count(*) from public.leads) as leads,
  (select count(*) from public.prospecta_bot_configs where deleted_at is null) as agentes,
  (select count(*) from public.prospecta_lead_import_batches) as lotes_importados,
  (select count(*) from public.prospecta_bot_events) as eventos_dos_agentes,
  (select count(*) from public.prospecta_app_logs) as logs_do_app;

-- =====================================================================
-- 4. Peso médio por empresa e projeção de quantas ainda cabem
--    Divide o espaço usado pelo número de empresas e compara com o limite.
-- =====================================================================
with uso as (
  select
    pg_database_size(current_database())::numeric as bytes_usados,
    greatest((select count(*) from public.tenants), 1)::numeric as empresas
)
select
  pg_size_pretty((bytes_usados / empresas)::bigint) as media_por_empresa,
  floor(
    ((500.0 * 1024 * 1024) - bytes_usados) / greatest(bytes_usados / empresas, 1)
  ) as empresas_que_ainda_cabem_no_free,
  floor(
    ((8.0 * 1024 * 1024 * 1024) - bytes_usados) / greatest(bytes_usados / empresas, 1)
  ) as empresas_que_ainda_cabem_no_pro
from uso;

-- =====================================================================
-- 5. Leads por empresa: quem está puxando o crescimento
-- =====================================================================
select
  tenant.name as empresa,
  count(lead.id) as leads,
  pg_size_pretty((count(lead.id) * 1024)::bigint) as espaco_aproximado
from public.tenants tenant
left join public.leads lead on lead.tenant_id = tenant.id
group by tenant.name
order by leads desc
limit 20;

-- =====================================================================
-- 6. Pressão de leitura: quanto o banco responde pela memória
--    Acima de 99% é saudável. Abaixo de 95% significa ir ao disco demais,
--    que foi o que estourou o Disk IO Budget antes.
-- =====================================================================
select
  round(
    sum(heap_blks_hit) * 100.0 / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0),
    2
  ) as porcentagem_servida_pela_memoria
from pg_statio_user_tables;

-- =====================================================================
-- 7. Tabelas lidas inteiras (varredura sequencial) muitas vezes
--    Muitas varreduras em tabela grande = consulta sem índice = disco à toa.
-- =====================================================================
select
  relname as tabela,
  seq_scan as varreduras_inteiras,
  idx_scan as buscas_por_indice,
  n_live_tup as linhas,
  n_dead_tup as linhas_mortas
from pg_stat_user_tables
where seq_scan > 0
order by seq_scan * greatest(n_live_tup, 1) desc
limit 15;

-- =====================================================================
-- 8. Conexões em uso contra o limite do servidor
--    Perto do limite, novos usuários começam a receber erro de conexão.
-- =====================================================================
select
  (select count(*) from pg_stat_activity) as conexoes_abertas,
  (select count(*) from pg_stat_activity where state = 'active') as conexoes_ativas,
  current_setting('max_connections') as limite_do_servidor;

-- =====================================================================
-- 9. Lixo acumulado: o que dá para limpar sem perder nada do negócio
--    Eventos e logs são histórico operacional, não dado de cliente.
-- =====================================================================
select
  (select count(*) from public.prospecta_bot_events
    where created_at < now() - interval '30 days') as eventos_com_mais_de_30_dias,
  (select count(*) from public.prospecta_app_logs
    where created_at < now() - interval '15 days') as logs_fora_da_retencao,
  (select count(*) from public.prospecta_lead_import_batches
    where created_at < now() - interval '90 days') as lotes_com_mais_de_90_dias;
