import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { deleteIcon, fetchCatalog, fetchZunoStorageUsage, formatSize, toMessage, type CatalogIcon } from "../lib/storeApi";
import { EmptyState, ErrorState } from "../components/ui";
import SoftLoader from "../components/SoftLoader";
import StorageGauge from "../components/StorageGauge";
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
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const dayStart = bakuDayStartISO();
      const [items, bytes, daily] = await Promise.all([
        fetchCatalog({ sort: "new", limit: 5000 }),
        fetchZunoStorageUsage(),
        requireSupabase().from("zuno_icon_catalog").select("id", { count: "exact", head: true }).gte("created_at", dayStart),
      ]);
      if (daily.error) throw daily.error;
      setIcons(items);
      setUsed(bytes);
      setDailyIcons(daily.count ?? 0);
    } catch (reason) {
      setError(toMessage(reason));
    } finally {
      setLoading(false);
    }
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
  if (error) return <ErrorState message={error} onRetry={() => setRefresh((n) => n + 1)} />;

  return <section className="admin-page">
    <div className="admin-heading"><div><p className="eyebrow">ZUNO CONTROL CENTER</p><h1>Yönetim paneli</h1><p className="muted">Hoş geldin, {user.email}</p></div><button className="btn btn--ghost" type="button" onClick={() => setRefresh((n) => n + 1)}>Yenile</button></div>
    <StorageGauge usedBytes={used} quotaBytes={STORAGE_CAP} />
    <section className="admin-release-card">
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
    <div className="admin-heading"><div><h2>Topluluk paylaşımları</h2><p className="muted">{icons.length} paylaşım listeleniyor</p></div></div>
    {icons.length === 0 ? <EmptyState title="Henüz paylaşım yok" text="Kullanıcıların yüklediği görseller burada görünür." /> :
      <div className="admin-grid">{icons.map((icon) => <article className="admin-item" key={icon.id}>
        <img src={icon.asset_url} alt={icon.title} loading="lazy" />
        <div className="admin-item__meta"><strong>{icon.title}</strong><small>@{icon.username ?? "bilinmeyen"} · {formatSize(icon.file_size)}</small><small>{icon.category}</small></div>
        <div className="admin-item__actions"><a className="btn btn--ghost btn--sm" href={`#/icon/${icon.id}`}>Görüntüle</a><button className="btn btn--danger btn--sm" type="button" onClick={() => void remove(icon)}>Sil</button></div>
      </article>)}</div>}
  </section>;
}
