import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        request,
        { error: "Autorização necessária" },
        401,
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } =
      await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse(
        request,
        { error: "Sessão inválida ou expirada" },
        401,
      );
    }

    const { data: tenantId, error: tenantError } =
      await userClient.rpc("current_tenant_id");
    if (tenantError || !tenantId) {
      return jsonResponse(
        request,
        { error: "Empresa não vinculada ao usuário" },
        403,
      );
    }

    const admin = createClient(supabaseUrl, serviceRole);
    const { data: callerMembership, error: membershipError } =
      await admin
        .from("tenant_memberships")
        .select("role")
        .eq("tenant_id", tenantId)
        .eq("user_id", authData.user.id)
        .not("accepted_at", "is", null)
        .maybeSingle();
    if (membershipError) throw membershipError;
    if (
      !callerMembership ||
      !["owner", "admin"].includes(callerMembership.role)
    ) {
      return jsonResponse(request, {
        error: "Apenas administradores da empresa podem remover usuários",
      }, 403);
    }

    const body = await request.json() as { user_id?: string };
    const userId = body.user_id;
    if (!userId) {
      return jsonResponse(
        request,
        { error: "user_id é obrigatório" },
        400,
      );
    }
    if (userId === authData.user.id) {
      return jsonResponse(
        request,
        { error: "Você não pode remover a si mesmo" },
        400,
      );
    }

    const { data: targetMembership } = await admin
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!targetMembership) {
      return jsonResponse(
        request,
        { error: "Usuário não pertence à sua empresa" },
        404,
      );
    }
    if (targetMembership.role === "owner") {
      return jsonResponse(
        request,
        { error: "O proprietário da empresa não pode ser removido" },
        400,
      );
    }

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      return jsonResponse(
        request,
        { error: error.message || "Falha ao remover usuário" },
        400,
      );
    }
    return jsonResponse(request, { ok: true });
  } catch (error) {
    console.error("delete-user:", error);
    return jsonResponse(request, {
      error: error instanceof Error
        ? error.message
        : "Erro interno do servidor",
    }, 500);
  }
});