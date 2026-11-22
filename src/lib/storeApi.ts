import { requireSupabase } from "./supabase";
import type { StoreIcon } from "./iconStore";

export type CatalogIcon = StoreIcon & {
  downloads: number;
  mime_type: string;
  file_size: number;
  storage_path: string;
};
export type SortKey = "new" | "popular" | "liked";
export type ProfileRow = { id: string; username: string; bio: string; created_at: string };

export const CATEGORIES: { value: string; label: string }[] = [
  { value: "Minimal", label: "Minimal" },
  { value: "Dark", label: "Koyu" },
  { value: "Colorful", label: "Renkli" },
  { value: "Gradient", label: "Gradyan" },
  { value: "Other", label: "Diğer" },
];

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const COLUMNS =
  "id,title,description,category,username,asset_url,like_count,created_at,downloads,mime_type,file_size,storage_path";

/** Supabase hataları Error örneği değildir; kullanıcıya gösterilecek metni çıkarır. */
export function toMessage(reason: unknown): string {
  if (reason instanceof Error && reason.message) return reason.message;
  if (reason && typeof reason === "object" && "message" in reason) {
    const m = (reason as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return "Beklenmeyen bir hata oluştu.";
}

/** Hiçbir istek sonsuza kadar beklemesin diye süre sınırı koyar. */
export function withTimeout<T>(work: PromiseLike<T>, ms = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("Sunucu yanıt vermedi. İnternet bağlantını kontrol edip tekrar dene.")),
      ms,
    );
    Promise.resolve(work).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function cleanSearch(raw: string): string {
  return raw.replace(/[%_,()*\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export async function fetchCatalog(options: {
  category?: string;
  search?: string;
  sort?: SortKey;
  username?: string;
}): Promise<CatalogIcon[]> {
  const client = requireSupabase();
  let query = client.from("zuno_icon_catalog").select(COLUMNS);
  if (options.category && options.category !== "All") query = query.eq("category", options.category);
  if (options.username) query = query.eq("username", options.username);
  const term = cleanSearch(options.search ?? "");
  if (term) query = query.or(`title.ilike.%${term}%,username.ilike.%${term}%`);
  const sort = options.sort ?? "new";
  if (sort === "popular") query = query.order("downloads", { ascending: false }).order("created_at", { ascending: false });
  else if (sort === "liked") query = query.order("like_count", { ascending: false }).order("created_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  const { data, error } = await withTimeout(query.limit(120));
  if (error) throw error;
  return (data ?? []) as CatalogIcon[];
}

export async function fetchIcon(id: string): Promise<CatalogIcon | null> {
  const client = requireSupabase();
  const { data, error } = await withTimeout(client.from("zuno_icon_catalog").select(COLUMNS).eq("id", id).maybeSingle());
  if (error) throw error;
  return (data as CatalogIcon | null) ?? null;
}

export async function fetchLikedIds(userId: string): Promise<Set<string>> {
  const client = requireSupabase();
  const { data, error } = await withTimeout(client.from("zuno_icon_likes").select("icon_id").eq("user_id", userId));
  if (error) throw error;
  return new Set((data ?? []).map((row: { icon_id: string }) => row.icon_id));
}

export async function fetchProfile(username: string): Promise<ProfileRow | null> {
  const client = requireSupabase();
  const { data, error } = await withTimeout(
    client.from("profiles").select("id,username,bio,created_at").eq("username", username.toLowerCase()).maybeSingle(),
  );
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

export async function updateBio(userId: string, bio: string): Promise<void> {
  const client = requireSupabase();
  const { data, error } = await withTimeout(
    client.from("profiles").update({ bio: bio.trim().slice(0, 300) }).eq("id", userId).select("id"),
  );
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Profil güncellenemedi.");
}

export async function updateIcon(
  id: string,
  patch: { title: string; description: string; category: string },
): Promise<void> {
  const title = patch.title.trim();
  if (title.length < 2 || title.length > 60) throw new Error("İkon adı 2–60 karakter olmalı.");
  if (patch.description.length > 500) throw new Error("Açıklama en fazla 500 karakter olabilir.");
  const client = requireSupabase();
  const { data, error } = await withTimeout(
    client
      .from("zuno_icons")
      .update({ title, description: patch.description.trim(), category: patch.category })
      .eq("id", id)
      .select("id"),
  );
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Bu ikonu düzenleme iznin yok.");
}

export async function deleteIcon(icon: Pick<CatalogIcon, "id" | "storage_path">): Promise<void> {
  const client = requireSupabase();
  const { data, error } = await withTimeout(client.from("zuno_icons").delete().eq("id", icon.id).select("id"));
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Bu ikonu silme iznin yok.");
  // Satır silindi; dosya temizliği başarısız olsa bile katalog tutarlı kalır.
  await client.storage.from("zuno-icons").remove([icon.storage_path]);
}

export async function registerDownload(id: string): Promise<boolean> {
  try {
    const { data, error } = await requireSupabase().functions.invoke("zuno-record-download", {
      body: { icon_id: id },
    });
    if (error) return false;
    return data?.counted === true;
  } catch {
    /* sayaç hatası indirmeyi engellememeli */
    return false;
  }
}

export function extensionFor(mime: string): string {
  return mime === "image/svg+xml" ? "svg" : mime === "image/webp" ? "webp" : "png";
}

export async function downloadIconFile(icon: CatalogIcon): Promise<boolean> {
  const response = await withTimeout(fetch(icon.asset_url), 30000);
  if (!response.ok) throw new Error("Dosya indirilemedi.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safe = icon.title.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "zuno-icon";
  link.href = url;
  link.download = `${safe}.${extensionFor(icon.mime_type)}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return registerDownload(icon.id);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
