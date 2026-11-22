import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "https://jlyinisqhkupddyfcdut.supabase.co";
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_sjwsqCho2mlpdzBUFQQ_dQ_2uBeSDwl";

export const supabaseReady = Boolean(url && publishableKey);
export const supabase = supabaseReady
  ? createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error("Supabase yapılandırması eksik. GitHub Actions değişkenlerini kontrol edin.");
  return supabase;
}
