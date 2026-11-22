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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { username, password } = await req.json();
    if (typeof username !== "string" || typeof password !== "string" || !/^[a-z0-9_]{3,24}$/i.test(username) || password.length < 1 || password.length > 256) {
      return json({ error: "Kullanıcı adı veya şifre hatalı." }, 400);
    }
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) return json({ error: "Sunucu yapılandırması eksik." }, 500);

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const auth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: profile, error: profileError } = await admin.from("profiles").select("id").eq("username", username.toLowerCase()).maybeSingle();
    if (profileError || !profile) return json({ error: "Kullanıcı adı veya şifre hatalı." }, 401);
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id);
    const email = userData?.user?.email;
    if (userError || !email) return json({ error: "Kullanıcı adı veya şifre hatalı." }, 401);
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error || !data.session) return json({ error: "Kullanıcı adı veya şifre hatalı." }, 401);
    return json({ session: data.session, user: { id: data.user.id } });
  } catch {
    return json({ error: "İstek işlenemedi." }, 400);
  }
});
