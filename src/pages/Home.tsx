import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { toggleIconLike } from "../lib/iconStore";
import { CATEGORIES, fetchCatalog, fetchLikedIds, toMessage, type CatalogIcon, type SortKey } from "../lib/storeApi";
import { useToast } from "../lib/toast";
import SoftLoader from "../components/SoftLoader";
import { EmptyState, ErrorState, GoButton, IconCard } from "../components/ui";

export default function Home() {
  const { user } = useAuth();
  const toast = useToast();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState<SortKey>("new");
  const [icons, setIcons] = useState<CatalogIcon[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setTerm(search), 280); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => {
    let alive = true;
    let timedOut = false;
    setError("");
    setStatus("loading");

    // Ağ isteği takılırsa yükleme ekranında sonsuza kadar kalma.
    const timer = window.setTimeout(() => {
      timedOut = true;
      if (alive) {
        setError("İkon sunucusu 12 saniye içinde yanıt vermedi. Bağlantıyı kontrol edip yeniden deneyebilirsin.");
        setStatus("error");
      }
    }, 12000);

    fetchCatalog({ category, search: term, sort, ids: favoritesOnly ? [...liked] : undefined })
      .then((data) => {
        if (alive && !timedOut) {
          setIcons(data);
          setStatus("ready");
        }
      })
      .catch((reason: unknown) => {
        if (alive && !timedOut) {
          setError(toMessage(reason));
          setStatus("error");
        }
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [category, term, sort, attempt, favoritesOnly, liked]);
  useEffect(() => {
    if (!user) { setLiked(new Set()); setFavoritesOnly(false); return; }
    let alive = true;
    fetchLikedIds(user.id).then((ids) => { if (alive) setLiked(ids); }).catch(() => undefined);
    return () => { alive = false; };
  }, [user]);
  async function onLike(icon: CatalogIcon) {
    if (!user) { toast("Beğenmek için giriş yapmalısın.", "error"); window.location.hash = "#/login"; return; }
    try {
      const nowLiked = await toggleIconLike(icon.id);
      setLiked((prev) => { const next = new Set(prev); if (nowLiked) next.add(icon.id); else next.delete(icon.id); return next; });
      setIcons((prev) => prev.map((item) => item.id === icon.id ? { ...item, like_count: Math.max(0, item.like_count + (nowLiked ? 1 : -1)) } : item));
    } catch (reason) { toast(toMessage(reason), "error"); }
  }
  const visibleIcons = favoritesOnly ? icons.filter((icon) => liked.has(icon.id)) : icons;
  const filtering = category !== "All" || term.trim() !== "" || favoritesOnly;
  return (
    <>
      <section className="hero"><p className="eyebrow">ZUNO TOPLULUĞU</p><h1>Ana ekranına yeni bir <span className="grad">görünüm</span> ver.</h1><p className="lead">Topluluğun tasarladığı ZUNO ikonlarını keşfet, indir ve kendi tasarımını paylaş.</p><div className="hero__actions"><GoButton to="/upload">İkon yükle</GoButton><GoButton to="/download" variant="ghost">ZUNO APK’yı indir</GoButton>{!user && <GoButton to="/register" variant="ghost">Ücretsiz kayıt ol</GoButton>}</div><div className="hero-art" aria-hidden="true"><div className="hero-art__halo hero-art__halo--one" /><div className="hero-art__halo hero-art__halo--two" /><div className="hero-art__glass"><span className="hero-art__shine" /><span className="hero-art__symbol">Z</span><span className="hero-art__caption">ZUNO / ICON LAB</span></div><span className="hero-art__tile hero-art__tile--a">✳</span><span className="hero-art__tile hero-art__tile--b">◈</span><span className="hero-art__tile hero-art__tile--c">✦</span><span className="hero-art__orbit-dot" /></div></section>
      <section className="toolbar glass" aria-label="Arama ve filtreler">
        <label className="search"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m20 20-4.2-4.2M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İkon veya üretici ara…" aria-label="İkon ara" maxLength={60} /></label>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sıralama"><option value="new">En yeni</option><option value="popular">En çok indirilen</option><option value="liked">En çok beğenilen</option></select>
        <div className="chips" role="group" aria-label="Kategoriler">{user && <button type="button" className={`chip ${favoritesOnly ? "chip--on" : ""}`} aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}>Beğendiklerim</button>}{[{ value: "All", label: "Tümü" }, ...CATEGORIES].map((c) => <button key={c.value} type="button" className={`chip ${category === c.value ? "chip--on" : ""}`} aria-pressed={category === c.value} onClick={() => setCategory(c.value)}>{c.label}</button>)}</div>
      </section>
      {status === "loading" && <SoftLoader title="ZUNO galerisi hazırlanıyor" subtitle="Topluluğun ikonları yükleniyor" />}
      {status === "error" && <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />}
      {status === "ready" && visibleIcons.length === 0 && <EmptyState title={favoritesOnly ? "Henüz beğendiğin ikon yok" : filtering ? "Sonuç bulunamadı" : "Henüz paylaşılmış ikon yok"} text={favoritesOnly ? "Beğendiğin ikonları kalp düğmesiyle kaydet; burada kolayca bulabilirsin." : filtering ? "Aramayı veya kategoriyi değiştirmeyi dene." : "İlk ikonu sen yükle, topluluğu başlat."} action={favoritesOnly || filtering ? <button type="button" className="btn btn--ghost" onClick={() => { setSearch(""); setCategory("All"); setFavoritesOnly(false); }}>Filtreleri temizle</button> : <GoButton to="/upload">İlk ikonu yükle</GoButton>} />}
      {status === "ready" && visibleIcons.length > 0 && <><p className="count">{favoritesOnly ? `${visibleIcons.length} beğenilen ikon` : `${visibleIcons.length} ikon`}</p><div className="grid">{visibleIcons.map((icon, i) => <IconCard key={icon.id} icon={icon} index={i} liked={liked.has(icon.id)} onLike={onLike} />)}</div></>}
    </>
  );
}
