-- Permite que as Edge Functions administrativas consultem e atribuam papéis.
-- A chave service_role permanece restrita ao backend e ignora as políticas RLS.
grant select, insert, delete
on table public.user_roles
to service_role;

grant insert
on table public.team_members
to service_role;
