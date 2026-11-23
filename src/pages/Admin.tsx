import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { deleteIcon, fetchCatalog, fetchZunoStorageUsage, formatSize, toMessage, type CatalogIcon } from "../lib/storeApi";
import { EmptyState, ErrorState } from "../components/ui";
import SoftLoader from "../components/SoftLoader";
import StorageGauge from "../components/StorageGauge";
import AdminPromoManager from "../components/AdminPromoManager";
import AdminSiteManager from "../components/AdminSiteManager";
import { useToast } from "../lib/toast";
import { requireSupabase } from "../lib/supabase";

const STORAGE_CAP = 1024 * 1024 * 1024;

function bakuDayStartISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "0";
  const year = Number(part("year"));
  const month = Number(part("month"));
  const day = Number(part("day"));
  // Azerbaijan uses UTC+04:00; convert Baku midnight to UTC for Supabase.
  return new Date(Date.UTC(year, month - 1, day) - 4 * 60 * 60 * 1000).toISOString();
}

export default function Admin() {
  const { user, isAdmin, ready } = useAuth();
  const toast = useToast();
  const [icons, setIcons] = useState<CatalogIcon[]>([]);
  const [used, setUsed] = useState(0);
  const [dailyIcons, setDailyIcons] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dataWarnings, setDataWarnings] = useState<string[]>([]);
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const dayStart = bakuDayStartISO();
    const results = await Promise.allSettled([
      fetchCatalog({ sort: "new", limit: 5000 }),
      fetchZunoStorageUsage(),
      requireSupabase().from("zuno_icon_catalog").select("id", { count: "exact", head: true }).gte("created_at", dayStart),
    ]);
    const warnings: string[] = [];
    if (results[0].status === "fulfilled") setIcons(results[0].value);
    else { setIcons([]); warnings.push("Topluluk ikonları alınamadı: " + toMessage(results[0].reason)); }
    if (results[1].status === "fulfilled") setUsed(results[1].value);
    else warnings.push("Depolama verisi alınamadı: " + toMessage(results[1].reason));
    if (results[2].status === "fulfilled" && !results[2].value.error) setDailyIcons(results[2].value.count ?? 0);
    else warnings.push("Günlük ikon sayısı alınamadı: " + toMessage(results[2].status === "rejected" ? results[2].reason : results[2].value.error));
    setDataWarnings(warnings);
    setLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load, refresh]);

  if (!ready) return null;
  if (!user) return <EmptyState title="Yönetici girişi gerekli" text="Yönetim paneline erişmek için admin hesabınla giriş yap." action={<a className="btn btn--primary" href="#/login">Giriş yap</a>} />;
  if (!isAdmin) return <EmptyState title="Erişim reddedildi" text="Bu sayfa yalnızca yetkili ZUNO yöneticisine açıktır." action={<a className="btn btn--ghost" href="#/">Ana sayfaya dön</a>} />;

  async function remove(icon: CatalogIcon) {
    if (!window.confirm(`"${icon.title}" paylaşımını ve depolanan dosyasını kalıcı olarak silmek istiyor musun?`)) return;
    try {
      await deleteIcon(icon);
      setIcons((items) => items.filter((item) => item.id !== icon.id));
      setUsed(await fetchZunoStorageUsage());
      toast("Paylaşım ve dosyası silindi.");
    } catch (reason) {
      toast(toMessage(reason), "error");
    }
  }

  if (loading) return <SoftLoader title="Yönetim paneli hazırlanıyor" subtitle="Paylaşımlar ve depolama kontrol ediliyor" />;


  return <section className="admin-page">
    <div className="admin-heading"><div><p className="eyebrow">ZUNO CONTROL CENTER</p><h1>Yönetim paneli</h1><p className="muted">Hoş geldin, {user.email}. İşlemlerini buradan kolayca yönet.</p></div><button className="btn btn--ghost" type="button" onClick={() => setRefresh((n) => n + 1)}>Verileri yenile</button></div>
    {error && <ErrorState message={error} onRetry={() => setRefresh((n) => n + 1)} />}
    {dataWarnings.length > 0 && <div className="admin-data-warning" role="status"><strong>Bazı istatistikler yüklenemedi</strong>{dataWarnings.map((warning) => <p key={warning}>{warning}</p>)}<button type="button" className="btn btn--ghost btn--sm" onClick={() => setRefresh((n) => n + 1)}>Tekrar dene</button></div>}
    <div className="admin-overview" aria-label="Yönetim özeti">
      <article className="admin-overview__card"><span>Toplam ikon paylaşımı</span><strong>{icons.length.toLocaleString("tr-TR")}</strong><small>Yayındaki topluluk içerikleri</small></article>
      <article className="admin-overview__card"><span>Bugünkü yeni ikonlar</span><strong>{dailyIcons.toLocaleString("tr-TR")} <i>/ 20</i></strong><small>Otomatik APK hedefi</small></article>
      <article className="admin-overview__card"><span>Kullanılan depolama</span><strong>{formatSize(used)}</strong><small>Toplam kota: {formatSize(STORAGE_CAP)}</small></article>
    </div>
    <nav className="admin-quicknav" aria-label="Yönetim bölümleri">
      <a href="#admin-site">Siteyi düzenle</a><a href="#admin-promo">Tanıtım içeriği</a><a href="#admin-apk">APK güncellemesi</a><a href="#admin-community">Topluluk ikonları</a>
    </nav>
    <section id="admin-storage"><StorageGauge usedBytes={used} quotaBytes={STORAGE_CAP} /></section>
    <div id="admin-site" className="admin-anchor"><AdminSiteManager /></div>
    <div id="admin-promo" className="admin-anchor"><AdminPromoManager /></div>
    <section id="admin-apk" className="admin-release-card">
      <div className="admin-release-card__top">
        <div><p className="eyebrow">OTOMATİK APK GÜNCELLEMESİ</p><h2>Günlük ikon hedefi</h2></div>
        <strong>{dailyIcons} / 20</strong>
      </div>
      <div className="admin-release-card__track"><span style={{ width: `${Math.min(100, dailyIcons / 20 * 100)}%` }} /></div>
      <p className="muted">{dailyIcons >= 20
        ? "Günlük hedef tamamlandı. ZUNO'nun yeni ikon kataloğu senkronize edilip imzalı APK derlemesi başlatılır."
        : `Bugün ${20 - dailyIcons} yeni herkese açık ikon daha gerekli. Sistem her saat kontrol eder.`}</p>
      <small className="admin-note">Günlük sayaç Azerbaycan saatine göre çalışır. Aynı gün içinde en fazla bir otomatik APK güncellemesi tetiklenir.</small>
    </section>
    <div id="admin-community" className="admin-heading admin-anchor"><div><h2>Topluluk ikonları</h2><p className="muted">{icons.length} paylaşım listeleniyor. İstenmeyen içerikleri buradan kaldırabilirsin.</p></div></div>
    {icons.length === 0 ? <EmptyState title="Henüz paylaşım yok" text="Kullanıcıların yüklediği görseller burada görünür." /> :
      <div className="admin-grid">{icons.map((icon) => <article className="admin-item" key={icon.id}>
        <img src={icon.asset_url} alt={icon.title} loading="lazy" />
        <div className="admin-item__meta"><strong>{icon.title}</strong><small>@{icon.username ?? "bilinmeyen"} · {formatSize(icon.file_size)}</small><small>{icon.category}</small></div>
        <div className="admin-item__actions"><a className="btn btn--ghost btn--sm" href={`#/icon/${icon.id}`}>Görüntüle</a><button className="btn btn--danger btn--sm" type="button" onClick={() => void remove(icon)}>Sil</button></div>
      </article>)}</div>}
  </section>;
}
