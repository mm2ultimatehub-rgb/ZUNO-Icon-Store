import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { signOut, toggleIconLike } from "../lib/iconStore";
import { navigate } from "../lib/router";
import { deleteIcon, fetchCatalog, fetchLikedIds, fetchProfile, formatDate, toMessage, updateBio, type CatalogIcon, type ProfileRow } from "../lib/storeApi";
import { useToast } from "../lib/toast";
import SoftLoader from "../components/SoftLoader";
import { EmptyState, ErrorState, GoButton, IconCard, SkeletonGrid } from "../components/ui";

/** username verilmezse giriş yapmış kullanıcının kendi profili gösterilir. */
export default function Profile({ username }: { username?: string }) {
  const { user, username: myName, ready } = useAuth();
  const toast = useToast();
  const target = username ?? myName ?? "";
  const own = Boolean(user && myName && target === myName);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [icons, setIcons] = useState<CatalogIcon[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [bio, setBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);

  useEffect(() => {
    if (!target) return;
    let alive = true;
    setStatus("loading");
    Promise.all([fetchProfile(target), fetchCatalog({ username: target, sort: "new" })])
      .then(([row, list]) => { if (alive) { setProfile(row); setBio(row?.bio ?? ""); setIcons(list); setStatus("ready"); } })
      .catch((reason: unknown) => { if (alive) { setError(toMessage(reason)); setStatus("error"); } });
    return () => { alive = false; };
  }, [target, attempt]);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchLikedIds(user.id).then((ids) => { if (alive) setLiked(ids); }).catch(() => undefined);
    return () => { alive = false; };
  }, [user]);

  if (!ready) return null;
  if (!username && !user) return <EmptyState title="Profilini görmek için giriş yap" text="Hesabın yoksa saniyeler içinde oluşturabilirsin." action={<div className="row row--center"><GoButton to="/login">Giriş yap</GoButton><GoButton to="/register" variant="ghost">Kayıt ol</GoButton></div>} />;
  if (!target) return <SkeletonGrid count={4} />;

  async function onLike(icon: CatalogIcon) {
    if (!user) { toast("Beğenmek için giriş yapmalısın.", "error"); navigate("/login"); return; }
    try {
      const now = await toggleIconLike(icon.id);
      setLiked((prev) => { const next = new Set(prev); if (now) next.add(icon.id); else next.delete(icon.id); return next; });
      setIcons((prev) => prev.map((i) => i.id === icon.id ? { ...i, like_count: Math.max(0, i.like_count + (now ? 1 : -1)) } : i));
    } catch (reason) { toast(toMessage(reason), "error"); }
  }
  async function onDelete(icon: CatalogIcon) {
    if (!window.confirm(`"${icon.title}" kalıcı olarak silinecek. Emin misin?`)) return;
    try { await deleteIcon(icon); setIcons((prev) => prev.filter((i) => i.id !== icon.id)); toast("İkon silindi."); }
    catch (reason) { toast(toMessage(reason), "error"); }
  }
  async function onSaveBio() {
    if (!user) return;
    setSavingBio(true);
    try { await updateBio(user.id, bio); setProfile((p) => p ? { ...p, bio: bio.trim() } : p); setEditingBio(false); toast("Profil güncellendi."); }
    catch (reason) { toast(toMessage(reason), "error"); }
    finally { setSavingBio(false); }
  }
  async function onSignOut() {
    try { await signOut(); toast("Çıkış yapıldı."); navigate("/"); }
    catch (reason) { toast(toMessage(reason), "error"); }
  }
  if (status === "loading") return <SoftLoader title="Profil hazırlanıyor" subtitle="Paylaşımlar yükleniyor" />;
  if (status === "error") return <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!profile) return <EmptyState title="Kullanıcı bulunamadı" text="Bu kullanıcı adıyla bir profil yok." action={<GoButton to="/">Galeriye dön</GoButton>} />;

  const totalLikes = icons.reduce((sum, i) => sum + i.like_count, 0);
  const totalDownloads = icons.reduce((sum, i) => sum + i.downloads, 0);
  return <>
    <section className="profile glass"><span className="avatar avatar--xl">{profile.username.slice(0, 1).toUpperCase()}</span><div className="profile__main">
      <h1>@{profile.username}</h1><p className="muted small">{formatDate(profile.created_at)} tarihinden beri üye</p>
      {editingBio ? <div className="form"><textarea value={bio} maxLength={300} rows={3} onChange={(e) => setBio(e.target.value)} placeholder="Kendinden kısaca bahset…" /><div className="row"><button type="button" className="btn btn--primary btn--sm" onClick={onSaveBio} disabled={savingBio}>{savingBio ? "Kaydediliyor…" : "Kaydet"}</button><button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingBio(false)}>Vazgeç</button></div></div> : <p className="desc">{profile.bio || (own ? "Henüz bir biyografi eklemedin." : "")}</p>}
      <dl className="stats stats--inline"><div><dt>İkon</dt><dd>{icons.length}</dd></div><div><dt>Beğeni</dt><dd>{totalLikes}</dd></div><div><dt>İndirme</dt><dd>{totalDownloads}</dd></div></dl>
      {own && !editingBio && <div className="row"><GoButton to="/upload">İkon yükle</GoButton><GoButton to="/ai-connect" variant="ghost">AI Connect</GoButton><button type="button" className="btn btn--ghost" onClick={() => setEditingBio(true)}>Profili düzenle</button><button type="button" className="btn btn--ghost" onClick={onSignOut}>Çıkış yap</button></div>}
    </div></section>
    <h2 className="section-title">{own ? "İkonlarım" : "İkonları"}</h2>
    {icons.length === 0 ? <EmptyState title="Henüz ikon yok" text={own ? "İlk ikonunu yükleyerek topluluğa katıl." : "Bu kullanıcı henüz ikon paylaşmadı."} action={own ? <GoButton to="/upload">İkon yükle</GoButton> : undefined} /> : <div className="grid">{icons.map((icon, i) => <div className="owned" key={icon.id}><IconCard icon={icon} index={i} liked={liked.has(icon.id)} onLike={onLike} />{own && <div className="owned__actions"><a className="btn btn--ghost btn--sm" href={`#/icon/${icon.id}`}>Düzenle</a><button type="button" className="btn btn--danger btn--sm" onClick={() => onDelete(icon)}>Sil</button></div>}</div>)}</div>}
  </>;
}
