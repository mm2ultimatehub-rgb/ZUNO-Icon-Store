import { requireSupabase } from "./supabase";
export type IconCategory = "Minimal" | "Dark" | "Colorful" | "Gradient" | "Other";
export type StoreIcon = { id: string; title: string; description: string; category: string; username: string | null; asset_url: string; like_count: number; created_at: string };
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/webp", "image/svg+xml"];

export async function listIcons(options?: { category?: string; search?: string }): Promise<StoreIcon[]> {
  const client = requireSupabase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    let query = client.from("zuno_icon_catalog").select("id,title,description,category,username,asset_url,like_count,created_at").order("created_at", { ascending: false }).abortSignal(controller.signal);
    if (options?.category && options.category !== "All") query = query.eq("category", options.category);
    if (options?.search?.trim()) query = query.ilike("title", `%${options.search.trim().replace(/[%_]/g, "")}%`);
    const { data, error } = await query;
    if (error) {
      if (controller.signal.aborted) throw new Error("Supabase bağlantısı zaman aşımına uğradı. İnternet bağlantını kontrol edip yeniden dene.");
      throw error;
    }
    return (data ?? []) as StoreIcon[];
  } catch (error) {
    if (controller.signal.aborted) throw new Error("İkonlar 10 saniye içinde yüklenemedi. Supabase bağlantısını kontrol edip yeniden dene.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadIcon(input: { file: File; title: string; description?: string; category?: IconCategory }) {
  const client = requireSupabase();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) throw new Error("İkon yüklemek için giriş yapmalısın.");
  if (!ALLOWED_TYPES.includes(input.file.type)) throw new Error("Yalnızca PNG, WebP veya SVG yükleyebilirsin.");
  if (input.file.size > MAX_FILE_SIZE) throw new Error("Dosya boyutu en fazla 5 MB olabilir.");
  const title = input.title.trim();
  if (title.length < 2 || title.length > 60) throw new Error("İkon adı 2–60 karakter olmalı.");
  const ext = input.file.type === "image/svg+xml" ? "svg" : input.file.type === "image/webp" ? "webp" : "png";
  const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await client.storage.from("zuno-icons").upload(path, input.file, { contentType: input.file.type, cacheControl: "31536000", upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await client.from("zuno_icons").insert({ user_id: auth.user.id, title, description: input.description?.trim() ?? "", category: input.category ?? "Other", storage_path: path, mime_type: input.file.type, file_size: input.file.size }).select().single();
  if (error) {
    await client.storage.from("zuno-icons").remove([path]);
    throw error;
  }
  return data;
}

export async function listLikedIconIds(): Promise<string[]> {
  const client = requireSupabase();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await client.from("zuno_icon_likes").select("icon_id").eq("user_id", auth.user.id);
  if (error) throw error;
  return (data ?? []).map((row) => row.icon_id as string);
}

export async function toggleIconLike(iconId: string) {
  const client = requireSupabase();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) throw new Error("Beğenmek için giriş yapmalısın.");
  const { data: existing, error: readError } = await client.from("zuno_icon_likes").select("icon_id").eq("icon_id", iconId).eq("user_id", auth.user.id).maybeSingle();
  if (readError) throw readError;
  if (existing) {
    const { error } = await client.from("zuno_icon_likes").delete().eq("icon_id", iconId).eq("user_id", auth.user.id);
    if (error) throw error;
    return false;
  }
  const { error } = await client.from("zuno_icon_likes").insert({ icon_id: iconId, user_id: auth.user.id });
  if (error) throw error;
  return true;
}

export async function signUpWithUsername(input: { username: string; email: string; password: string }) {
  const client = requireSupabase();
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) throw new Error("Kullanıcı adı 3–24 karakter olmalı; yalnızca İngilizce harf, rakam ve _ kullanılabilir.");
  if (input.password.length < 8) throw new Error("Şifre en az 8 karakter olmalı.");
  const { data, error } = await client.auth.signUp({ email: input.email.trim(), password: input.password, options: { data: { username } } });
  if (error) throw error;
  return data;
}

export async function signInWithUsername(username: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("username-login", { body: { username: username.trim().toLowerCase(), password } });
  if (error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null) as { error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
    }
    throw error;
  }
  if (!data?.session?.access_token || !data?.session?.refresh_token) throw new Error(data?.error ?? "Giriş yapılamadı.");
  const { error: sessionError } = await client.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  if (sessionError) throw sessionError;
  return data.user;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function verifySignupOtp(email: string, token: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: "email" });
  if (error) throw error;
  return data;
}

export async function resendSignupOtp(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.resend({ type: "signup", email: email.trim() });
  if (error) throw error;
}
