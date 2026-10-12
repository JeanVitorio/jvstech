-- Diagnóstico seguro: este arquivo não altera nenhum dado.
-- Execute no SQL Editor e confira a conta usada no teste do checkout.

select
  auth_user.email,
  profile.active_tenant_id,
  tenant.name as empresa,
  membership.tenant_id,
  membership.role,
  membership.accepted_at,
  subscription.plan_code,
  subscription.status as assinatura_status
from auth.users auth_user
left join public.profiles profile
  on profile.id = auth_user.id
left join public.tenant_memberships membership
  on membership.user_id = auth_user.id
left join public.tenants tenant
  on tenant.id = membership.tenant_id
left join public.tenant_subscriptions subscription
  on subscription.tenant_id = membership.tenant_id
order by auth_user.created_at desc, membership.created_at;

-- O usuário que assina precisa apresentar:
-- role = owner ou admin
-- accepted_at preenchido
-- active_tenant_id igual ao tenant_id
