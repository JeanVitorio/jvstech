// @ts-nocheck
// Arquivo autocontido para colar diretamente no painel do Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("LEADFLOW_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeaders(request) {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] ?? "");
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json",
    },
  });
}

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
    const authorization = request.headers.get("Authorization");

    if (!supabaseUrl || !anonKey || !serviceRole) {
      throw new Error("Configuração Supabase indisponível");
    }
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(request, { error: "Autorização necessária" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse(request, { error: "Sessão inválida ou expirada" }, 401);
    }

    const body = await request.json();
    const userId = String(body.user_id ?? "").trim();
    const tenantRole = String(body.tenant_role ?? "").trim();
    if (!userId || !["admin", "member"].includes(tenantRole)) {
      return jsonResponse(request, { error: "Usuário ou nível de acesso inválido" }, 400);
    }

    const { error: roleError } = await userClient.rpc("prospecta_change_tenant_member_role", {
      p_user_id: userId,
      p_role: tenantRole,
    });
    if (roleError) {
      return jsonResponse(request, { error: roleError.message }, 403);
    }

    const admin = createClient(supabaseUrl, serviceRole);
    const { data: target } = await admin.auth.admin.getUserById(userId);
    if (target.user) {
      const appRole = tenantRole === "admin" ? "manager" : "collaborator";
      await admin.auth.admin.updateUserById(userId, {
        app_metadata: {
          ...target.user.app_metadata,
          tenant_role: tenantRole,
          app_role: appRole,
        },
      });
    }

    return jsonResponse(request, { ok: true });
  } catch (error) {
    console.error("update-user-role:", error);
    return jsonResponse(
      request,
      {
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      500,
    );
  }
});
