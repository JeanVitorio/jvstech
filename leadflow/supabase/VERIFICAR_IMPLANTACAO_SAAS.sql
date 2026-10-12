-- Execute depois do arquivo EXECUTAR_NO_SQL_EDITOR_SAAS.sql.
-- Todas as consultas abaixo são somente leitura.

select code, name, monthly_price_cents, leads_per_month, stripe_product_id
from public.subscription_plans
order by monthly_price_cents;

select
  tenant.id,
  tenant.name,
  subscription.plan_code,
  subscription.status,
  subscription.current_period_start,
  subscription.current_period_end
from public.tenants tenant
join public.tenant_subscriptions subscription
  on subscription.tenant_id = tenant.id
order by tenant.created_at;

select
  tenant.name,
  usage.leads_limit,
  usage.leads_used,
  usage.period_start,
  usage.period_end
from public.tenant_usage_periods usage
join public.tenants tenant on tenant.id = usage.tenant_id
order by usage.period_start desc;

select table_name, orphan_rows
from (
  select 'leads' as table_name, count(*) as orphan_rows
  from public.leads where tenant_id is null
  union all
  select 'prospecta_bot_configs', count(*)
  from public.prospecta_bot_configs where tenant_id is null
  union all
  select 'prospecta_bot_runners', count(*)
  from public.prospecta_bot_runners where tenant_id is null
  union all
  select 'prospecta_message_bot_configs', count(*)
  from public.prospecta_message_bot_configs where tenant_id is null
) validation
order by table_name;

select
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'tenants',
    'tenant_memberships',
    'tenant_subscriptions',
    'tenant_usage_periods',
    'leads',
    'prospecta_bot_configs',
    'prospecta_message_bot_configs'
  )
order by tablename, policyname;

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'current_tenant_id',
    'prospecta_get_billing_status',
    'prospecta_insert_leads_with_quota',
    'prospecta_sync_stripe_subscription',
    'prospecta_claim_message_lead'
  )
order by routine_name;
