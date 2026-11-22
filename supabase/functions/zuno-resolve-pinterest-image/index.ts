import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function isPinterestHost(host: string): boolean {
  const value = host.toLowerCase();
  return value === "pin.it" || value === "pinterest.com" || value.endsWith(".pinterest.com");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)));
}

function extractMetaImage(html: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }
    const key = (attrs.property ?? attrs.name ?? "").toLowerCase();
    if (key === "og:image" || key === "og:image:secure_url" || key === "twitter:image") {
      const value = decodeHtml(attrs.content ?? "").trim();
      if (value) return value;
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Only POST is supported." });

  try {
    const body = await req.json().catch(() => ({}));
    const sourceUrl = typeof body?.url === "string" ? body.url.trim() : "";
    if (!sourceUrl || sourceUrl.length > 2048) return json(400, { error: "Pinterest bağlantısı geçersiz." });

    let parsed: URL;
    try { parsed = new URL(sourceUrl); } catch { return json(400, { error: "Geçerli bir bağlantı gir." }); }
    if (parsed.protocol !== "https:" || !isPinterestHost(parsed.hostname)) {
      return json(400, { error: "Yalnızca Pinterest pin.it veya pinterest.com bağlantıları destekleniyor." });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let page: Response;
    try {
      page = await fetch(parsed.href, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ZUNOIconStore/1.0; +https://mm2ultimatehub-rgb.github.io/ZUNO-Icon-Store/)",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    const finalUrl = new URL(page.url || parsed.href);
    if (!isPinterestHost(finalUrl.hostname)) return json(400, { error: "Pinterest bağlantısı güvenli bir Pinterest sayfasına yönlenmedi." });
    if (!page.ok) return json(502, { error: "Pinterest sayfası açılamadı. Pin herkese açık mı kontrol et." });
    const contentType = page.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) return json(415, { error: "Pinterest bu bağlantı için görsel sayfası döndürmedi." });

    const html = (await page.text()).slice(0, 3_000_000);
    const imageValue = extractMetaImage(html);
    if (!imageValue) return json(422, { error: "Pinterest görsel önizlemesi bulunamadı. Pin herkese açık olmayabilir." });

    const imageUrl = new URL(imageValue, finalUrl);
    if (imageUrl.protocol !== "https:" || imageUrl.hostname.toLowerCase() !== "i.pinimg.com") {
      return json(422, { error: "Pinterest güvenli bir görsel adresi sağlamadı." });
    }

    return json(200, { sourceUrl: finalUrl.href, imageUrl: imageUrl.href, mimeType: "image/jpeg" });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Pinterest bağlantısı zaman aşımına uğradı."
      : "Pinterest görseli çözümlenemedi. Pin bağlantısını kontrol edip tekrar dene.";
    return json(502, { error: message });
  }
});
