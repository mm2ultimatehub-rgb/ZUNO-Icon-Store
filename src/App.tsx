import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  listIcons, listLikedIconIds, resendSignupOtp, signInWithUsername, signOut, signUpWithUsername, toggleIconLike, verifySignupOtp,
  uploadIcon, type IconCategory, type StoreIcon,
} from "./lib/iconStore";
import { supabase, supabaseReady } from "./lib/supabase";

type AuthMode = "login" | "register";
const categories = ["All", "Minimal", "Dark", "Colorful", "Gradient", "Other"] as const;

function IconMark({ name }: { name: string }) {
  const paths: Record<string, string> = {
    search: "m20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
    upload: "M12 16V4m0 0L7 9m5-5 5 5M4 16v4h16v-4",
    heart: "M20.8 8.8c0 5.5-8.8 10.2-8.8 10.2S3.2 14.3 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z",
    close: "M18 6 6 18M6 6l12 12",
    arrow: "M7 17 17 7M7 7h10v10",
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    user: "M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name] ?? paths.grid} /></svg>;
}

export default function App() {
  const [icons, setIcons] = useState<StoreIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState<IconCategory>("Minimal");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [liked, setLiked] = useState<string[]>([]);

  const refreshIcons = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await listIcons({ category, search });
      setIcons(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "İkonlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => { void refreshIcons(); }, [refreshIcons]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      event.preventDefault();
      document.getElementById("icon-search")?.focus();
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    if (!user?.id) { setLiked([]); return; }
    void listLikedIconIds().then(ids => { if (active) setLiked(ids); }).catch(error => {
      if (active) setLoadError(error instanceof Error ? error.message : "Beğeniler yüklenemedi.");
    });
    return () => { active = false; };
  }, [user?.id]);

  const displayName = useMemo(() => {
    return user?.user_metadata?.username || user?.email?.split("@")[0] || "ZUNO member";
  }, [user]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true); setAuthError(""); setAuthMessage("");
    try {
      if (authMode === "register") {
        const result = await signUpWithUsername({ username, email, password });
        if (!result.session) {
          setPendingEmail(email.trim());
          setSignupOtp("");
          setAuthMessage("E-posta adresine gönderilen 6 haneli kodu aşağıya gir.");
        } else {
          setUser(result.user);
          setAuthOpen(false);
          setPassword("");
        }
      } else {
        const signedIn = await signInWithUsername(username, password);
        setUser(signedIn);
        setAuthOpen(false);
        setPassword("");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "İşlem tamamlanamadı. Tekrar dene.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerifySignupOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true); setAuthError(""); setAuthMessage("");
    try {
      const result = await verifySignupOtp(pendingEmail, signupOtp);
      if (!result.session || !result.user) throw new Error("Doğrulama tamamlandı ancak oturum açılamadı. Giriş yapmayı dene.");
      setUser(result.user); setPendingEmail(""); setSignupOtp(""); setPassword(""); setAuthOpen(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Kod doğrulanamadı. Kontrol edip tekrar dene.");
    } finally { setAuthBusy(false); }
  }

  async function handleResendSignupOtp() {
    setAuthBusy(true); setAuthError(""); setAuthMessage("");
    try { await resendSignupOtp(pendingEmail); setAuthMessage("Yeni doğrulama kodu e-posta adresine gönderildi."); }
    catch (error) { setAuthError(error instanceof Error ? error.message : "Kod gönderilemedi. Biraz sonra tekrar dene."); }
    finally { setAuthBusy(false); }
  }

  async function handleLogout() {
    try { await signOut(); setUser(null); setLiked([]); }
    catch (error) { setLoadError(error instanceof Error ? error.message : "Çıkış yapılamadı."); }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadFile) { setUploadError("Önce bir PNG, WebP veya SVG dosyası seç."); return; }
    setUploadBusy(true); setUploadError("");
    try {
      await uploadIcon({ file: uploadFile, title: uploadTitle, description: uploadDescription, category: uploadCategory });
      setUploadOpen(false); setUploadTitle(""); setUploadDescription(""); setUploadFile(null);
      await refreshIcons();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Yükleme başarısız oldu.");
    } finally { setUploadBusy(false); }
  }

  async function handleLike(iconId: string) {
    if (!user) { setAuthMode("login"); setAuthOpen(true); return; }
    try {
      const isLiked = await toggleIconLike(iconId);
      setLiked(current => isLiked ? [...current, iconId] : current.filter(id => id !== iconId));
      await refreshIcons();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Beğeni kaydedilemedi.");
    }
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar glass">
        <a className="brand" href="./" aria-label="ZUNO Icon Store ana sayfa"><span className="brand-mark">Z</span><span className="brand-copy">ZUNO<small>ICON STORE</small></span></a>
        <nav className="top-nav"><a className="nav-active" href="#discover">Keşfet</a><a href="#community">Topluluk</a></nav>
        <div className="top-actions">
          {user ? <><span className="user-chip"><span className="user-avatar">{String(displayName).slice(0,1).toUpperCase()}</span>{displayName}</span><button className="button button-quiet" onClick={() => void handleLogout()}>Çıkış</button></> :
            <button className="button button-quiet" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}>Giriş yap</button>}
          <button className="button button-primary" onClick={() => user ? setUploadOpen(true) : (setAuthMode("login"), setAuthOpen(true))}><IconMark name="upload" /> İkon yükle</button>
        </div>
      </header>

      <section className="hero" id="discover">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> ZUNO TASARIM TOPLULUĞU</div>
          <h1>Ana ekranına<br /><span>yeni bir karakter.</span></h1>
          <p>ZUNO topluluğunun hazırladığı ikonları keşfet. Kendi tasarımlarını paylaş, ilham ver ve koleksiyonunu oluştur.</p>
          <div className="hero-actions"><button className="button button-primary button-large" onClick={() => document.getElementById("icon-gallery")?.scrollIntoView({ behavior: "smooth" })}>Koleksiyonu keşfet <IconMark name="arrow" /></button><span className="hero-note"><IconMark name="grid" /> Topluluk tarafından oluşturuldu</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-a" /><div className="orbit orbit-b" />
          <div className="floating-icon float-a"><span>✳</span></div><div className="floating-icon float-b"><span>◈</span></div>
          <div className="showcase-card"><div className="showcase-top"><span>ICON SET / 001</span><span className="live-dot" /></div><div className="showcase-symbol">Z</div><div className="showcase-bottom"><strong>Make it yours.</strong><span>DESIGNED FOR ZUNO</span></div></div>
        </div>
      </section>

      {!supabaseReady && <div className="notice"><strong>Bağlantı yapılandırılmamış.</strong> Supabase istemcisi başlatılamadı.</div>}
      {loadError && <div className="notice" role="alert"><span>{loadError}</span><button onClick={() => void refreshIcons()}>Yeniden dene</button></div>}

      <section className="gallery-section" id="icon-gallery">
        <div className="section-heading"><div><div className="eyebrow">KOLEKSİYONU İNCELE</div><h2>Topluluk ikonları<span>.</span></h2><p>Tarzını bul, favorilerini seç.</p></div><div className="gallery-count"><strong>{icons.length.toString().padStart(2, "0")}</strong><span>GÖRÜNEN TASARIM</span></div></div>
        <div className="toolbar glass">
          <label className="search-box"><IconMark name="search" /><input id="icon-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="İkonlarda ara..." aria-label="İkonlarda ara" /><kbd>/</kbd></label>
          <div className="category-list" aria-label="Kategori filtreleri">{categories.map(item => <button key={item} className={category === item ? "category active" : "category"} onClick={() => setCategory(item)}>{item === "All" ? "Tümü" : item}</button>)}</div>
        </div>
        {loading ? <div className="loading-state"><span className="spinner" /><p>Koleksiyon hazırlanıyor…</p></div> :
          icons.length ? <div className="icon-grid">{icons.map(icon => <article className="icon-card glass" key={icon.id}>
            <div className="icon-preview"><img src={icon.asset_url} alt={icon.title} loading="lazy" /><button className={liked.includes(icon.id) ? "like-button liked" : "like-button"} aria-label={liked.includes(icon.id) ? "Beğeniyi kaldır" : "İkonu beğen"} aria-pressed={liked.includes(icon.id)} onClick={() => void handleLike(icon.id)}><IconMark name="heart" /></button></div>
            <div className="icon-info"><div><h3>{icon.title}</h3><p>{icon.category} · @{icon.username || "creator"}</p></div><span className="like-count"><IconMark name="heart" /> {icon.like_count ?? 0}</span></div>
          </article>)}</div> :
          <div className="empty-state glass"><div className="empty-mark"><IconMark name="grid" /></div><h3>{search || category !== "All" ? "Bu filtrede sonuç yok." : "İlk tasarımını bekliyoruz."}</h3><p>{search || category !== "All" ? "Arama kelimesini veya kategoriyi değiştirmeyi dene." : "Topluluğun ilk ikonunu sen paylaş."}</p>{!search && category === "All" && <button className="button button-primary" onClick={() => user ? setUploadOpen(true) : setAuthOpen(true)}>İlk ikonu yükle</button>}</div>}
      </section>

      <section className="community-banner glass" id="community"><div className="community-symbol">✳</div><div><div className="eyebrow">ZUNO COMMUNITY</div><h2>Senin tasarımın. Herkesin ilhamı.</h2><p>İkonlarını paylaş, diğer tasarımcıların çalışmalarını keşfet.</p></div><button className="button button-primary" onClick={() => user ? setUploadOpen(true) : setAuthOpen(true)}>Topluluğa katıl <IconMark name="arrow" /></button></section>
      <footer className="footer"><a className="brand footer-brand" href="./"><span className="brand-mark">Z</span><span className="brand-copy">ZUNO<small>ICON STORE</small></span></a><span>Topluluk tarafından, ZUNO için tasarlandı.</span><span>© 2026 ZUNO</span></footer>

      {authOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setAuthOpen(false); }}><section className="modal glass modal-auth" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Kapat"><IconMark name="close" /></button>
        <div className="modal-emblem">Z</div><div className="eyebrow">ZUNO COMMUNITY</div><h2 id="auth-title">{authMode === "login" ? "Tekrar hoş geldin." : "Aramıza katıl."}</h2><p className="modal-subtitle">{authMode === "login" ? "Koleksiyonunu keşfetmeye devam et." : "Bir hesap oluştur ve tasarımlarını paylaş."}</p>
        <div className="auth-tabs"><button className={authMode === "login" ? "selected" : ""} onClick={() => { setAuthMode("login"); setAuthError(""); setAuthMessage(""); }}>Giriş yap</button><button className={authMode === "register" ? "selected" : ""} onClick={() => { setAuthMode("register"); setAuthError(""); setAuthMessage(""); }}>Kayıt ol</button></div>
        {pendingEmail ? <form onSubmit={event => void handleVerifySignupOtp(event)} className="modal-form">
          <p className="otp-instructions"><strong>{pendingEmail}</strong> adresine gönderilen doğrulama kodunu gir. Gelen kutunu ve spam klasörünü kontrol et.</p>
          <label>6 haneli doğrulama kodu<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={signupOtp} onChange={event => setSignupOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label>
          {authError && <p className="form-error" role="alert">{authError}</p>}{authMessage && <p className="form-success" role="status">{authMessage}</p>}
          <button className="button button-primary submit-button" disabled={authBusy || signupOtp.length !== 6}>{authBusy ? "Doğrulanıyor…" : "E-postayı doğrula"}</button>
          <button type="button" className="otp-resend" disabled={authBusy} onClick={() => void handleResendSignupOtp()}>Kodu tekrar gönder</button>
          <button type="button" className="otp-resend" disabled={authBusy} onClick={() => { setPendingEmail(""); setSignupOtp(""); setAuthError(""); setAuthMessage(""); }}>E-posta adresini değiştir</button>
        </form> : <form onSubmit={event => void handleAuth(event)} className="modal-form">
          <label>Kullanıcı adı<input required minLength={3} maxLength={24} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="ornek_kullanici" /></label>
          {authMode === "register" && <label>E-posta<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="ornek@eposta.com" /></label>}
          <label>Şifre<input required type="password" minLength={8} autoComplete={authMode === "login" ? "current-password" : "new-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="En az 8 karakter" /></label>
          {authError && <p className="form-error" role="alert">{authError}</p>}{authMessage && <p className="form-success" role="status">{authMessage}</p>}
          <button className="button button-primary submit-button" disabled={authBusy}>{authBusy ? "İşleniyor…" : authMode === "login" ? "Giriş yap" : "Hesap oluştur"}</button>
        </form>}<p className="privacy-note">Hesabın Supabase güvenli kimlik doğrulamasıyla korunur.</p>
      </section></div>}

      {uploadOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setUploadOpen(false); }}><section className="modal glass modal-upload" role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <button className="modal-close" onClick={() => setUploadOpen(false)} aria-label="Kapat"><IconMark name="close" /></button><div className="eyebrow">TOPLULUĞA KATKI</div><h2 id="upload-title">İkonunu paylaş.</h2><p className="modal-subtitle">PNG, WebP veya SVG · En fazla 5 MB</p>
        <form className="modal-form" onSubmit={event => void handleUpload(event)}>
          <label className="file-drop"><IconMark name="upload" /><strong>{uploadFile ? uploadFile.name : "Dosyanı seç veya buraya dokun"}</strong><span>PNG / WEBP / SVG</span><input type="file" accept="image/png,image/webp,image/svg+xml" onChange={event => setUploadFile(event.target.files?.[0] ?? null)} /></label>
          <label>İkon adı<input required minLength={2} maxLength={60} value={uploadTitle} onChange={event => setUploadTitle(event.target.value)} placeholder="Örn. Soft Shapes" /></label>
          <label>Açıklama <span className="optional-label">İsteğe bağlı</span><textarea rows={3} maxLength={240} value={uploadDescription} onChange={event => setUploadDescription(event.target.value)} placeholder="Tasarımından biraz bahset..." /></label>
          <label>Kategori<select value={uploadCategory} onChange={event => setUploadCategory(event.target.value as IconCategory)}>{categories.filter(item => item !== "All").map(item => <option key={item} value={item}>{item}</option>)}</select></label>
          {uploadError && <p className="form-error" role="alert">{uploadError}</p>}
          <button className="button button-primary submit-button" disabled={uploadBusy}>{uploadBusy ? "Yükleniyor…" : "İkonu yayınla"}</button>
        </form><p className="privacy-note">Yalnızca sana ait veya paylaşma iznin olan tasarımları yükle.</p>
      </section></div>}
    </main>
  );
}
