begin;

-- Permissões mínimas usadas pelas Edge Functions de checkout e portal.
grant usage on schema public to service_role;

grant select on table
  public.profiles,
  public.tenant_memberships,
  public.tenants,
  public.subscription_plans,
  public.tenant_subscriptions
to service_role;

grant update (stripe_customer_id)
on table public.tenants
to service_role;

commit;

-- A consulta deve retornar true em todas as colunas.
select
  has_table_privilege(
    'service_role',
    'public.tenant_memberships',
    'SELECT'
  ) as pode_ler_vinculos,
  has_table_privilege(
    'service_role',
    'public.subscription_plans',
    'SELECT'
  ) as pode_ler_planos,
  has_table_privilege(
    'service_role',
    'public.tenants',
    'SELECT'
  ) as pode_ler_empresas,
  has_column_privilege(
    'service_role',
    'public.tenants',
    'stripe_customer_id',
    'UPDATE'
  ) as pode_salvar_cliente_stripe;
