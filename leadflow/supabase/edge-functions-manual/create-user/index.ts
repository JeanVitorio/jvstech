// @ts-nocheck
// Arquivo autocontido para colar diretamente no painel do Supabase.
// supabase/functions/create-user/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
var allowedOrigins = (Deno.env.get("LEADFLOW_ALLOWED_ORIGINS") ?? "")
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
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") {
    return json(req, { error: "M\xE9todo n\xE3o permitido" }, 405);
  }
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
      throw new Error("Configura\xE7\xE3o Supabase indispon\xEDvel");
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json(req, { error: "Autoriza\xE7\xE3o necess\xE1ria" }, 401);
    }
    const jwt = authHeader.substring(7);
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const {
      data: { user: caller },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !caller) {
      return json(req, { error: "Sess\xE3o inv\xE1lida ou expirada" }, 401);
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: tenantId, error: tenantError } = await userClient.rpc("current_tenant_id");
    if (tenantError || !tenantId) {
      return json(req, { error: "Empresa n\xE3o vinculada ao usu\xE1rio" }, 403);
    }
    const { data: membership, error: membershipError } = await admin
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", caller.id)
      .not("accepted_at", "is", null)
      .maybeSingle();
    if (membershipError) {
      console.error("Error fetching caller membership:", membershipError);
      return json(req, { error: "Erro ao verificar permiss\xF5es" }, 500);
    }
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return json(
        req,
        {
          error: "Apenas administradores da empresa podem criar usu\xE1rios",
        },
        403,
      );
    }
    const body = await req.json();
    const {
      email,
      password,
      name,
      tenant_role = "member",
      position,
      phone,
      hourly_rate,
      contract_start,
      contract_end,
      team_ids = [],
    } = body;
    if (!email || !password || !name) {
      return json(req, { error: "Campos obrigat\xF3rios: email, password, name" }, 400);
    }
    if (password.length < 6) {
      return json(req, { error: "Senha deve ter no m\xEDnimo 6 caracteres" }, 400);
    }
    if (!["admin", "member"].includes(tenant_role)) {
      return json(req, { error: "N\xEDvel inv\xE1lido" }, 400);
    }
    const { data: billingStatus, error: billingError } = await userClient.rpc(
      "prospecta_get_billing_status",
    );
    if (billingError) {
      return json(req, { error: "N\xE3o foi poss\xEDvel validar o limite do plano" }, 500);
    }
    if (
      typeof billingStatus?.user_limit === "number" &&
      Number(billingStatus.users_used ?? 0) >= billingStatus.user_limit
    ) {
      return json(req, { error: "Limite de usu\xE1rios do plano atingido" }, 409);
    }
    if (
      tenant_role === "admin" &&
      typeof billingStatus?.admin_limit === "number" &&
      Number(billingStatus.admins_used ?? 0) >= billingStatus.admin_limit
    ) {
      return json(req, { error: "Limite de administradores do plano atingido" }, 409);
    }
    const appRole = tenant_role === "admin" ? "manager" : "collaborator";
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
      app_metadata: {
        tenant_id: tenantId,
        app_role: appRole,
        tenant_role,
      },
    });
    if (createErr || !created.user) {
      return json(req, { error: createErr?.message ?? "Falha ao criar usu\xE1rio" }, 400);
    }
    const newUserId = created.user.id;
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: newUserId,
        email: email.trim().toLowerCase(),
        name,
        position: position?.trim() || null,
        phone: phone?.trim() || null,
        hourly_rate: typeof hourly_rate === "number" ? hourly_rate : null,
        contract_start: contract_start || null,
        contract_end: contract_end || null,
        is_active: true,
        active_tenant_id: tenantId,
      },
      { onConflict: "id" },
    );
    if (profileError) {
      console.error("Error updating profile:", profileError);
      await admin.auth.admin.deleteUser(newUserId);
      return json(req, { error: "Falha ao criar o perfil do usu\xE1rio" }, 500);
    }
    const { error: deleteError } = await admin.from("user_roles").delete().eq("user_id", newUserId);
    if (deleteError) {
      console.error("Error deleting old roles:", deleteError);
    }
    const { error: insertError } = await admin
      .from("user_roles")
      .insert([{ user_id: newUserId, role: appRole }]);
    if (insertError) {
      console.error("Error inserting role:", insertError);
      await admin.auth.admin.deleteUser(newUserId);
      return json(req, { error: "Falha ao atribuir n\xEDvel de acesso" }, 500);
    }
    if (Array.isArray(team_ids) && team_ids.length > 0) {
      const { data: allowedTeams, error: allowedTeamsError } = await admin
        .from("teams")
        .select("id")
        .eq("tenant_id", tenantId)
        .in("id", team_ids);
      if (allowedTeamsError) throw allowedTeamsError;
      const teamRows = (allowedTeams ?? []).map(({ id: tid }) => ({
        team_id: tid,
        tenant_id: tenantId,
        user_id: newUserId,
        role_in_team: tenant_role === "admin" ? "manager" : "member",
      }));
      if (teamRows.length > 0) {
        const { error: teamError } = await admin.from("team_members").insert(teamRows);
        if (teamError) {
          console.error("Error adding to teams:", teamError);
        }
      }
    }
    return json(req, { ok: true, user_id: newUserId });
  } catch (e) {
    console.error("Unexpected error in create-user:", e);
    return json(
      req,
      {
        error: e instanceof Error ? e.message : "Erro interno do servidor",
      },
      500,
    );
  }
});
function json(request, b, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}
