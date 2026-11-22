import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
async function fingerprint(ip: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const iconId = body?.icon_id;
    if (!isUuid(iconId)) return json({ error: "Geçersiz ikon kimliği." }, 400);
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Sunucu yapılandırması eksik." }, 500);
    // Cloudflare's edge-provided client IP is used; spoofable forwarded headers are ignored.
    const ip = req.headers.get("cf-connecting-ip")?.trim();
    if (!ip) return json({ counted: false, reason: "client_ip_unavailable" });
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const clientFingerprint = await fingerprint(ip, serviceKey);
    const day = new Date().toISOString().slice(0, 10);
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("zuno_icon_download_events").delete().lt("created_at", cutoff);
    const { error: eventError } = await admin.from("zuno_icon_download_events").insert({ icon_id: iconId, fingerprint: clientFingerprint, download_day: day });
    if (eventError?.code === "23505") return json({ counted: false, reason: "already_counted_today" });
    if (eventError) return json({ error: "İndirme kaydı oluşturulamadı." }, 500);
    const { error: incrementError } = await admin.rpc("zuno_increment_download", { p_icon_id: iconId });
    if (incrementError) {
      await admin.from("zuno_icon_download_events").delete().eq("icon_id", iconId).eq("fingerprint", clientFingerprint).eq("download_day", day);
      return json({ error: "İndirme sayacı güncellenemedi." }, 500);
    }
    return json({ counted: true });
  } catch {
    return json({ error: "İstek işlenemedi." }, 400);
  }
});
