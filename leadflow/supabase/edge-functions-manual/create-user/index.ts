// @ts-nocheck
// Arquivo autocontido para colar diretamente no painel do Supabase.
// supabase/functions/create-user/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json({ error: "Autoriza\xE7\xE3o necess\xE1ria" }, 401);
    }
    const jwt = authHeader.substring(7);
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) {
      return json({ error: "Sess\xE3o inv\xE1lida ou expirada" }, 401);
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: tenantId, error: tenantError } = await userClient.rpc("current_tenant_id");
    if (tenantError || !tenantId) {
      return json({ error: "Empresa n\xE3o vinculada ao usu\xE1rio" }, 403);
    }
    const { data: membership, error: membershipError } = await admin.from("tenant_memberships").select("role").eq("tenant_id", tenantId).eq("user_id", caller.id).not("accepted_at", "is", null).maybeSingle();
    if (membershipError) {
      console.error("Error fetching caller membership:", membershipError);
      return json({ error: "Erro ao verificar permiss\xF5es" }, 500);
    }
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return json({
        error: "Apenas administradores da empresa podem criar usu\xE1rios"
      }, 403);
    }
    const body = await req.json();
    const {
      email,
      password,
      name,
      role = "collaborator",
      position,
      phone,
      hourly_rate,
      contract_start,
      contract_end,
      team_ids = []
    } = body;
    if (!email || !password || !name) {
      return json({ error: "Campos obrigat\xF3rios: email, password, name" }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Senha deve ter no m\xEDnimo 6 caracteres" }, 400);
    }
    if (!["collaborator", "manager", "commercial", "leader"].includes(role)) {
      return json({ error: "N\xEDvel inv\xE1lido" }, 400);
    }
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        name
      },
      app_metadata: {
        tenant_id: tenantId,
        app_role: role
      }
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "Falha ao criar usu\xE1rio" }, 400);
    }
    const newUserId = created.user.id;
    const { error: profileError } = await admin.from("profiles").upsert({
      id: newUserId,
      email: email.trim().toLowerCase(),
      name,
      position: position?.trim() || null,
      phone: phone?.trim() || null,
      hourly_rate: typeof hourly_rate === "number" ? hourly_rate : null,
      contract_start: contract_start || null,
      contract_end: contract_end || null,
      is_active: true
    }, { onConflict: "id" });
    if (profileError) {
      console.error("Error updating profile:", profileError);
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: "Falha ao criar o perfil do usu\xE1rio" }, 500);
    }
    const { error: deleteError } = await admin.from("user_roles").delete().eq("user_id", newUserId);
    if (deleteError) {
      console.error("Error deleting old roles:", deleteError);
    }
    const { error: insertError } = await admin.from("user_roles").insert([{ user_id: newUserId, role }]);
    if (insertError) {
      console.error("Error inserting role:", insertError);
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: "Falha ao atribuir n\xEDvel de acesso" }, 500);
    }
    if (Array.isArray(team_ids) && team_ids.length > 0) {
      const teamRows = team_ids.map((tid) => ({
        team_id: tid,
        tenant_id: tenantId,
        user_id: newUserId,
        role_in_team: role === "manager" ? "manager" : "member"
      }));
      const { error: teamError } = await admin.from("team_members").insert(teamRows);
      if (teamError) {
        console.error("Error adding to teams:", teamError);
      }
    }
    return json({ ok: true, user_id: newUserId });
  } catch (e) {
    console.error("Unexpected error in create-user:", e);
    return json({
      error: e instanceof Error ? e.message : "Erro interno do servidor"
    }, 500);
  }
});
function json(b, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
