import { createClient } from "npm:@supabase/supabase-js@2";

export async function authorizeTenantManager(
  request: Request,
) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthorizationError("Autorização necessária", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRole) {
    throw new Error("Configuração Supabase indisponível");
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } =
    await userClient.auth.getUser();
  if (authError || !authData.user) {
    throw new AuthorizationError("Sessão inválida ou expirada", 401);
  }

  const { data: tenantId, error: tenantError } =
    await userClient.rpc("current_tenant_id");
  if (tenantError || !tenantId) {
    throw new AuthorizationError("Empresa não vinculada ao usuário", 403);
  }

  const admin = createClient(supabaseUrl, serviceRole);
  const { data: membership, error: membershipError } = await admin
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", authData.user.id)
    .not("accepted_at", "is", null)
    .maybeSingle();

  if (
    membershipError ||
    !membership ||
    !["owner", "admin"].includes(membership.role)
  ) {
    throw new AuthorizationError(
      "Apenas responsáveis pela assinatura podem realizar esta ação",
      403,
    );
  }

  return {
    user: authData.user,
    tenantId,
    tenantRole: membership.role,
    admin,
  };
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
