import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { toggleIconLike } from "../lib/iconStore";
import { navigate } from "../lib/router";
import { CATEGORIES, categoryLabel, deleteIcon, downloadIconFile, fetchIcon, fetchLikedIds, formatDate, formatSize, toMessage, updateIcon, type CatalogIcon } from "../lib/storeApi";
import { useToast } from "../lib/toast";
import SoftLoader from "../components/SoftLoader";
import { DownloadIcon, EmptyState, ErrorState, GoButton, HeartIcon, IconImage } from "../components/ui";

export default function IconDetail({ id }: { id: string }) {
  const { user, username } = useAuth();
  const toast = useToast();
  const [icon, setIcon] = useState<CatalogIcon | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState<"" | "download" | "like" | "save" | "delete">("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "Other" });

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetchIcon(id).then((row) => { if (alive) { setIcon(row); if (row) setForm({ title: row.title, description: row.description, category: row.category }); setStatus("ready"); } })
      .catch((reason: unknown) => { if (alive) { setError(toMessage(reason)); setStatus("error"); } });
    return () => { alive = false; };
  }, [id, attempt]);
  useEffect(() => {
    if (!user) { setLiked(false); return; }
    let alive = true;
    fetchLikedIds(user.id).then((ids) => { if (alive) setLiked(ids.has(id)); }).catch(() => undefined);
    return () => { alive = false; };
  }, [user, id]);
  if (status === "loading") return <SoftLoader title="İkon açılıyor" subtitle="Detaylar yükleniyor" />;
  if (status === "error") return <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!icon) return <EmptyState title="İkon bulunamadı" text="Bu ikon silinmiş ya da bağlantı hatalı olabilir." action={<GoButton to="/">Galeriye dön</GoButton>} />;

  const current = icon;
  const isOwner = Boolean(user && username && current.username === username);
  async function onDownload() {
    setBusy("download");
    try { const counted = await downloadIconFile(current); if (counted) setIcon({ ...current, downloads: current.downloads + 1 }); toast("İndirme başladı."); }
    catch (reason) { toast(toMessage(reason), "error"); }
    finally { setBusy(""); }
  }
  async function onLike() {
    if (!user) { toast("Beğenmek için giriş yapmalısın.", "error"); navigate("/login"); return; }
    setBusy("like");
    try { const now = await toggleIconLike(current.id); setLiked(now); setIcon({ ...current, like_count: Math.max(0, current.like_count + (now ? 1 : -1)) }); }
    catch (reason) { toast(toMessage(reason), "error"); }
    finally { setBusy(""); }
  }
  async function onShare() {
    const url = window.location.href;
    try { if (typeof navigator.share === "function") await navigator.share({ title: current.title, url }); else { await navigator.clipboard.writeText(url); toast("Bağlantı kopyalandı."); } }
    catch { /* kullanıcı paylaşımı iptal etti */ }
  }
  async function onSave() {
    setBusy("save");
    try { await updateIcon(current.id, form); setIcon({ ...current, title: form.title.trim(), description: form.description.trim(), category: form.category }); setEditing(false); toast("Değişiklikler kaydedildi."); }
    catch (reason) { toast(toMessage(reason), "error"); }
    finally { setBusy(""); }
  }
  async function onDelete() {
    if (!window.confirm("Bu ikon kalıcı olarak silinecek. Emin misin?")) return;
    setBusy("delete");
    try { await deleteIcon(current); toast("İkon silindi."); navigate("/profile"); }
    catch (reason) { toast(toMessage(reason), "error"); setBusy(""); }
  }

  return <article className="detail"><a className="back" href="#/">← Galeri</a><div className="detail__grid">
    <div className="detail__preview glass"><span className="card__glow" aria-hidden="true" /><IconImage icon={current} /></div>
    <div className="detail__info glass">
      {editing ? <div className="form"><label>İkon adı<input value={form.title} maxLength={60} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Açıklama<textarea value={form.description} maxLength={500} rows={4} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label>Kategori<select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label><div className="row"><button type="button" className="btn btn--primary" onClick={onSave} disabled={busy === "save"}>{busy === "save" ? "Kaydediliyor…" : "Kaydet"}</button><button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>Vazgeç</button></div></div> : <>
        <span className="pill">{categoryLabel(current.category)}</span><h1>{current.title}</h1><a className="creator" href={`#/u/${encodeURIComponent(current.username ?? "")}`}><span className="avatar">{(current.username ?? "?").slice(0, 1).toUpperCase()}</span>@{current.username ?? "bilinmiyor"}</a>
        {current.description && <p className="desc">{current.description}</p>}
        <dl className="stats"><div><dt>İndirme</dt><dd>{current.downloads}</dd></div><div><dt>Beğeni</dt><dd>{current.like_count}</dd></div><div><dt>Boyut</dt><dd>{formatSize(current.file_size)}</dd></div><div><dt>Biçim</dt><dd>{current.mime_type.replace("image/", "").replace("svg+xml", "svg").toUpperCase()}</dd></div></dl>
        <p className="muted">{formatDate(current.created_at)} tarihinde paylaşıldı</p>
        <div className="row"><button type="button" className="btn btn--primary" onClick={onDownload} disabled={busy === "download"}><DownloadIcon />{busy === "download" ? "İndiriliyor…" : "İndir"}</button><button type="button" className={`btn btn--ghost ${liked ? "is-liked" : ""}`} onClick={onLike} disabled={busy === "like"} aria-pressed={liked}><HeartIcon filled={liked} />{liked ? "Beğenildi" : "Beğen"}</button><button type="button" className="btn btn--ghost" onClick={onShare}>Paylaş</button></div>
        {isOwner && <div className="row row--owner"><button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>Düzenle</button><button type="button" className="btn btn--danger btn--sm" onClick={onDelete} disabled={busy === "delete"}>{busy === "delete" ? "Siliniyor…" : "Sil"}</button></div>}
      </>}
    </div>
  </div></article>;
}
