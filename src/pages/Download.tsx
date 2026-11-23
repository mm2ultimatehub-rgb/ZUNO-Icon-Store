import { useEffect, useState } from "react";
import { useSiteConfig } from "../lib/siteConfig";

type Asset = { name: string; size: number; browser_download_url: string };
type Release = { tag_name: string; published_at: string; html_url: string; assets: Asset[] };
const API = "https://api.github.com/repos/mm2ultimatehub-rgb/ZUNO/releases/latest";
const FALLBACK = "https://github.com/mm2ultimatehub-rgb/ZUNO/releases/latest/download/app-gms-mobile-arm64-release.apk";
function size(bytes: number) { return bytes ? (bytes / 1048576).toFixed(1) + " MB" : ""; }

export default function Download() {
  const { config } = useSiteConfig();
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(API, { headers: { Accept: "application/vnd.github+json" } })
      .then((r) => { if (!r.ok) throw new Error("Release API unavailable"); return r.json() as Promise<Release>; })
      .then((data) => { if (alive) setRelease(data); })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const apk = release?.assets?.find((a) => a.name === "app-gms-mobile-arm64-release.apk");
  const version = release?.tag_name?.replace(/^v/i, "") ?? "En son sürüm";
  const downloadUrl = config.download.apkUrl.trim() || (apk?.browser_download_url ?? FALLBACK);
  const date = release?.published_at ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(release.published_at)) : "";
  return <section className="download-page">
    <a className="back" href="#/">← Mağazaya dön</a>
    <div className="download-hero glass">
      <div className="download-orbit" aria-hidden="true"><span /><span /><span /></div>
      <div className="download-brand"><img src={config.brand.logoUrl || "./zuno-logo.svg"} alt="ZUNO" /></div>
      <p className="eyebrow">{config.download.eyebrow}</p>
      <h1>{config.download.title} <span className="grad">{config.download.highlight}</span></h1>
      <p className="lead">{config.download.description}</p>
      <div className="download-version">
        <span className="download-live"><i /> GÜNCEL SÜRÜM</span>
        <strong>{loading ? "Sürüm kontrol ediliyor…" : "ZUNO " + version}</strong>
        {apk && <span>{size(apk.size)} · ARM64 APK</span>}
        {date && <span>Yayın tarihi: {date}</span>}
        {failed && <span>Canlı sürüm bilgisi alınamadı. İndirme bağlantısı yine en son sürüme yönlendirir.</span>}
      </div>
      <a className="download-cta" href={downloadUrl}>
        <span className="download-cta__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19.5h16" /></svg></span>
        <span><strong>APK’yı indir</strong><small>Android için doğrudan indirme</small></span>
        <span className="download-cta__arrow" aria-hidden="true">↓</span>
      </a>
      <p className="download-safe">İndirme GitHub Releases üzerinden yapılır. Bağlantı her zaman en son kararlı ARM64 APK’yı açar.</p>
      <a className="download-release-link" href={release?.html_url ?? "https://github.com/mm2ultimatehub-rgb/ZUNO/releases"} target="_blank" rel="noreferrer">Tüm sürümleri ve değişiklik notlarını gör ↗</a>
    </div>
    <div className="download-features">{config.download.features.map((feature,index)=><article className="glass download-feature" key={index}><span>{String(index+1).padStart(2,"0")}</span><h2>{feature.title}</h2><p>{feature.description}</p></article>)}</div>
    <div className="download-note glass"><strong>Kurulum hakkında</strong><p>APK dosyasını indirdikten sonra Android’in kurulum ekranını aç. Güncelleme yaparken mevcut uygulamanın üzerine kurabilmek için aynı imza anahtarıyla imzalanmış sürümü kullanmalısın.</p></div>
  </section>;
}