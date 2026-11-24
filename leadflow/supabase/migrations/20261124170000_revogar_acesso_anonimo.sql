-- LeadFlow - Tira do visitante não logado o acesso a tabelas de pessoas.
-- A auditoria mostrou SELECT concedido ao papel anon em profiles, user_roles
-- e subscription_plans. Hoje isso não vaza nada, porque o RLS está ligado e
-- todas as políticas valem apenas para authenticated. Mas a permissão fica
-- ali esperando: basta alguém criar no futuro uma política para "public" e
-- os dados de pessoas ficam abertos. Defesa em camadas: removemos o que não
-- é usado.
--
-- subscription_plans continua aberta de propósito: são os preços públicos.
-- Se um dia a página de planos do site precisar ler sem login, é essa que vale.

begin;

revoke select on public.profiles from anon;
revoke select on public.user_roles from anon;

commit;

-- Conferência: deve sobrar apenas subscription_plans com acesso anonimo.
select
  table_name as tabela,
  string_agg(distinct privilege_type, ', ') as permissoes
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'PUBLIC')
group by table_name
order by table_name;
