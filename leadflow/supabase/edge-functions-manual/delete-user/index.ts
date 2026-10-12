// @ts-nocheck
// Arquivo autocontido para colar diretamente no painel do Supabase.
// supabase/functions/delete-user/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

// supabase/functions/_shared/cors.ts
var allowedOrigins = (Deno.env.get("LEADFLOW_ALLOWED_ORIGINS") ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
function corsHeaders(request) {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}
function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json"
    }
  });
}

// supabase/functions/delete-user/index.ts
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        request,
        { error: "Autoriza\xE7\xE3o necess\xE1ria" },
        401
      );
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } }
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse(
        request,
        { error: "Sess\xE3o inv\xE1lida ou expirada" },
        401
      );
    }
    const { data: tenantId, error: tenantError } = await userClient.rpc("current_tenant_id");
    if (tenantError || !tenantId) {
      return jsonResponse(
        request,
        { error: "Empresa n\xE3o vinculada ao usu\xE1rio" },
        403
      );
    }
    const admin = createClient(supabaseUrl, serviceRole);
    const { data: callerMembership, error: membershipError } = await admin.from("tenant_memberships").select("role").eq("tenant_id", tenantId).eq("user_id", authData.user.id).not("accepted_at", "is", null).maybeSingle();
    if (membershipError) throw membershipError;
    if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
      return jsonResponse(request, {
        error: "Apenas administradores da empresa podem remover usu\xE1rios"
      }, 403);
    }
    const body = await request.json();
    const userId = body.user_id;
    if (!userId) {
      return jsonResponse(
        request,
        { error: "user_id \xE9 obrigat\xF3rio" },
        400
      );
    }
    if (userId === authData.user.id) {
      return jsonResponse(
        request,
        { error: "Voc\xEA n\xE3o pode remover a si mesmo" },
        400
      );
    }
    const { data: targetMembership } = await admin.from("tenant_memberships").select("role").eq("tenant_id", tenantId).eq("user_id", userId).maybeSingle();
    if (!targetMembership) {
      return jsonResponse(
        request,
        { error: "Usu\xE1rio n\xE3o pertence \xE0 sua empresa" },
        404
      );
    }
    if (targetMembership.role === "owner") {
      return jsonResponse(
        request,
        { error: "O propriet\xE1rio da empresa n\xE3o pode ser removido" },
        400
      );
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      return jsonResponse(
        request,
        { error: error.message || "Falha ao remover usu\xE1rio" },
        400
      );
    }
    return jsonResponse(request, { ok: true });
  } catch (error) {
    console.error("delete-user:", error);
    return jsonResponse(request, {
      error: error instanceof Error ? error.message : "Erro interno do servidor"
    }, 500);
  }
});
