import { useEffect, useState } from "react";

function safeDecode(part: string): string {
  try { return decodeURIComponent(part); } catch { return part; }
}

/** Hash tabanlı yönlendirme: GitHub Pages'te sunucu ayarı gerektirmez. */
export function parseHash(): string[] {
  const raw = window.location.hash.replace(/^#\/?/, "");
  // Supabase e-posta onayı #access_token=... ile döner; bu bir rota değildir.
  if (!raw || raw.includes("=")) return [];
  return raw.split("?")[0].split("/").filter(Boolean).map(safeDecode);
}

export function useRoute(): string[] {
  const [parts, setParts] = useState<string[]>(parseHash);
  useEffect(() => {
    const onChange = () => { setParts(parseHash()); window.scrollTo({ top: 0 }); };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return parts;
}

export function navigate(to: string): void { window.location.hash = to; }
