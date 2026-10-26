import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getStripe } from "../_shared/stripe.ts";

const CONFIRMATION_TEXT = "EXCLUIR";
const ACTIVE_SUBSCRIPTION = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

class DeleteAccountError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// Exclui a conta de quem chamou. Se for o dono, apaga a empresa inteira:
// assinatura na Stripe, dados no banco e o login de todos os usuários dela.
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Método não permitido" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRole) {
      throw new Error("Configuração Supabase indisponível");
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      throw new DeleteAccountError("Autorização necessária", 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    const user = authData?.user;
    if (authError || !user?.email) {
      throw new DeleteAccountError("Sessão inválida ou expirada", 401);
    }

    const body = await request.json().catch(() => ({})) as {
      password?: unknown;
      confirmation?: unknown;
    };
    if (body.confirmation !== CONFIRMATION_TEXT) {
      throw new DeleteAccountError(`Digite ${CONFIRMATION_TEXT} para confirmar`, 400);
    }
    const password = typeof body.password === "string" ? body.password : "";
    if (!password || password.length > 200) {
      throw new DeleteAccountError("Informe sua senha", 400);
    }

    // Confirma a senha em um cliente isolado, sem guardar a nova sessão.
    const passwordCheck = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: passwordError } = await passwordCheck.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (passwordError) {
      throw new DeleteAccountError("Senha incorreta", 401);
    }
    await passwordCheck.auth.signOut({ scope: "local" }).catch(() => undefined);

    const admin = createClient(supabaseUrl, serviceRole);
    const { data: memberships, error: membershipError } = await admin
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", user.id);
    if (membershipError) throw membershipError;

    const ownedTenantIds = (memberships ?? [])
      .filter((item) => item.role === "owner")
      .map((item) => item.tenant_id as string);
    const tenants = await loadTenants(admin, ownedTenantIds);
    if (tenants.some((tenant) => tenant.slug === "jvs-leadflow")) {
      throw new DeleteAccountError(
        "Esta conta principal não pode ser excluída pelo app",
        403,
      );
    }

    const affectedUsers = new Set<string>([user.id]);
    for (const tenant of tenants) {
      if (tenant.stripe_customer_id) {
        await cancelSubscriptions(tenant.stripe_customer_id);
      }
      const { data: tenantUsers, error } = await admin.rpc(
        "prospecta_delete_tenant_account",
        { p_tenant_id: tenant.id },
      );
      if (error) throw error;
      for (const userId of (tenantUsers ?? []) as string[]) {
        affectedUsers.add(userId);
      }
    }

    for (const userId of affectedUsers) {
      // Colaborador que também participa de outra empresa mantém o login.
      if (userId !== user.id && await hasOtherMemberships(admin, userId)) continue;
      await removeAvatars(admin, userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }

    return jsonResponse(request, { ok: true });
  } catch (error) {
    console.error("delete-account:", error);
    if (error instanceof DeleteAccountError) {
      return jsonResponse(request, { error: error.message }, error.status);
    }
    return jsonResponse(
      request,
      { error: "Não foi possível excluir a conta. Tente novamente." },
      500,
    );
  }
});

async function loadTenants(admin: SupabaseClient, tenantIds: string[]) {
  if (!tenantIds.length) return [];
  const { data, error } = await admin
    .from("tenants")
    .select("id, slug, stripe_customer_id")
    .in("id", tenantIds);
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    slug: string;
    stripe_customer_id: string | null;
  }[];
}

// Encerra na hora, sem nova cobrança; o histórico fiscal continua na Stripe.
async function cancelSubscriptions(customerId: string) {
  const stripe = getStripe();
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });
  for (const subscription of subscriptions.data) {
    if (ACTIVE_SUBSCRIPTION.has(subscription.status)) {
      await stripe.subscriptions.cancel(subscription.id);
    }
  }
}

async function hasOtherMemberships(admin: SupabaseClient, userId: string) {
  const { count, error } = await admin
    .from("tenant_memberships")
    .select("tenant_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function removeAvatars(admin: SupabaseClient, userId: string) {
  const bucket = admin.storage.from("avatars");
  const { data: files } = await bucket.list(userId, { limit: 1000 });
  const paths = (files ?? []).map((file) => `${userId}/${file.name}`);
  if (paths.length) await bucket.remove(paths);
}
