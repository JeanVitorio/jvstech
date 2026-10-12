import { createClient } from "npm:@supabase/supabase-js@2";

export async function authorizeTenantManager(request: Request) {
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
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    throw new AuthorizationError("Sessão inválida ou expirada", 401);
  }

  const admin = createClient(supabaseUrl, serviceRole);
  const [{ data: profile }, { data: memberships, error: membershipError }] = await Promise.all([
    admin.from("profiles").select("active_tenant_id").eq("id", authData.user.id).maybeSingle(),
    admin
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", authData.user.id)
      .not("accepted_at", "is", null)
      .order("created_at", { ascending: true }),
  ]);

  if (membershipError) throw membershipError;
  const membership =
    memberships?.find((item) => item.tenant_id === profile?.active_tenant_id) ?? memberships?.[0];
  if (!membership) {
    throw new AuthorizationError("Empresa não vinculada ao usuário", 403);
  }
  if (!["owner", "admin"].includes(membership.role)) {
    throw new AuthorizationError(
      "Apenas o proprietário ou administrador pode alterar a assinatura",
      403,
    );
  }

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .select("id")
    .eq("id", membership.tenant_id)
    .maybeSingle();
  if (tenantError || !tenant) {
    throw new AuthorizationError("Empresa não encontrada", 403);
  }

  const tenantId = membership.tenant_id;

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
