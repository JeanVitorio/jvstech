-- LeadFlow - Auditoria de segurança do banco (somente leitura).
-- Responde o que o código-fonte não garante: o que está realmente ligado no
-- banco em produção. Selecione o arquivo inteiro e rode no SQL Editor.
--
-- Como ler o resultado:
--   1. RLS desligado ......... GRAVE. Tabela aberta para qualquer usuário logado.
--   2. Sem politica .......... Tabela com RLS mas sem regra: ninguém lê (ou só service_role).
--   3. Politica aberta ....... Regra que vale para todo mundo (condição "true").
--   4. Funcao insegura ....... SECURITY DEFINER sem search_path fixo.
--   5. Acesso anonimo ........ Permissão concedida a quem nem fez login.
--   6. Resumo ................ Contagem geral para bater o olho.

with tabelas as (
  select
    c.oid,
    c.relname::text as nome,
    c.relrowsecurity as rls_ligado,
    (select count(*) from pg_policy p where p.polrelid = c.oid) as politicas
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
),
politicas_abertas as (
  select
    p.polrelid::regclass::text as tabela,
    p.polname::text as politica,
    case p.polcmd
      when 'r' then 'SELECT'
      when 'a' then 'INSERT'
      when 'w' then 'UPDATE'
      when 'd' then 'DELETE'
      else 'TODOS'
    end as comando
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and (
      coalesce(pg_get_expr(p.polqual, p.polrelid), 'true') = 'true'
      or coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') = 'true'
    )
),
funcoes_inseguras as (
  select p.proname::text as nome
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and (
      p.proconfig is null
      or not exists (
        select 1 from unnest(p.proconfig) cfg where cfg like 'search_path=%'
      )
    )
),
acesso_anonimo as (
  select
    table_name::text as tabela,
    string_agg(distinct privilege_type, ', ') as permissoes
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'PUBLIC')
  group by table_name
)
select secao, item, valor
from (
  -- 1. Tabelas sem RLS: o problema mais grave da lista
  select 1 as ordem, row_number() over (order by nome) as sub,
         '1. RLS desligado' as secao,
         nome as item,
         'QUALQUER usuario logado le e escreve nesta tabela' as valor
  from tabelas
  where not rls_ligado

  -- 2. Com RLS, mas sem nenhuma política
  union all
  select 2, row_number() over (order by nome), '2. Sem politica',
         nome,
         'RLS ligado sem regra: so service_role enxerga'
  from tabelas
  where rls_ligado and politicas = 0

  -- 3. Políticas que valem para todo mundo
  union all
  select 3, row_number() over (order by tabela, politica), '3. Politica aberta',
         tabela || ' / ' || politica,
         'vale para todos no comando ' || comando
  from politicas_abertas

  -- 4. Funções SECURITY DEFINER sem search_path fixo
  union all
  select 4, row_number() over (order by nome), '4. Funcao insegura',
         nome,
         'SECURITY DEFINER sem search_path fixo'
  from funcoes_inseguras

  -- 5. Permissões concedidas a visitante não logado
  union all
  select 5, row_number() over (order by tabela), '5. Acesso anonimo',
         tabela,
         permissoes
  from acesso_anonimo

  -- 6. Resumo para bater o olho
  union all
  select 6, 1, '6. Resumo', 'Tabelas publicas',
         (select count(*)::text from tabelas)
  union all
  select 6, 2, '6. Resumo', 'Tabelas sem RLS',
         (select count(*)::text from tabelas where not rls_ligado)
  union all
  select 6, 3, '6. Resumo', 'Politicas abertas',
         (select count(*)::text from politicas_abertas)
  union all
  select 6, 4, '6. Resumo', 'Funcoes sem search_path',
         (select count(*)::text from funcoes_inseguras)
  union all
  select 6, 5, '6. Resumo', 'Tabelas com acesso anonimo',
         (select count(*)::text from acesso_anonimo)
) auditoria
order by ordem, sub;
