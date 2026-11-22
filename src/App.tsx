import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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


function SoftLoader({ title, subtitle }: { title: string; subtitle: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapeName, setShapeName] = useState("Yumuşak yıldız");
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const TAU = Math.PI * 2;
    const N = 180;
    const defs = [
      { name: "Yumuşak yıldız", radius: (t: number) => 1 + .1 * Math.cos(10 * t) },
      { name: "Altıgen", radius: (t: number) => { const seg = TAU / 6; const p = ((((t + Math.PI / 2) % seg) + seg) % seg) - seg / 2; return Math.cos(Math.PI / 6) / Math.cos(p); } },
      { name: "Beşgen", radius: (t: number) => { const seg = TAU / 5; const p = ((((t + Math.PI / 2) % seg) + seg) % seg) - seg / 2; return Math.cos(Math.PI / 5) / Math.cos(p); } },
      { name: "Kare", radius: (t: number) => { const a = t + Math.PI / 2 + Math.PI / 4; const seg = TAU / 4; const p = ((((a % seg) + seg) % seg) - seg / 2); return Math.cos(Math.PI / 4) / Math.cos(p); } },
      { name: "Üçgen", radius: (t: number) => { const seg = TAU / 3; const p = ((((t + Math.PI / 2) % seg) + seg) % seg) - seg / 2; return Math.cos(Math.PI / 3) / Math.cos(p); } },
      { name: "Hap", radius: (t: number) => Math.pow(Math.pow(Math.abs(Math.cos(t)) / .74, 3.2) + Math.pow(Math.abs(Math.sin(t)), 3.2), -1 / 3.2) },
      { name: "Güneş", radius: (t: number) => 1 + .14 * Math.cos(8 * t) },
    ];
    const shapes = defs.map(def => {
      const raw = Array.from({ length: N }, (_, i) => def.radius(i / N * TAU));
      const mean = raw.reduce((sum, value) => sum + value, 0) / N;
      return { name: def.name, values: raw.map(value => value * (.92 / mean)) };
    });
    let width = 0, height = 0, dpr = 1, raf = 0, start = performance.now(), lastLabel = "";
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const draw = (now: number) => {
      const elapsed = reduced ? 0 : (now - start) / 1000;
      const step = Math.floor(elapsed / .8);
      const local = (elapsed - step * .8) / .55;
      const eased = local < 1 ? 1 + 2.1 * Math.pow(local - 1, 3) + 1.1 * Math.pow(local - 1, 2) : 1;
      const a = shapes[step % shapes.length];
      const b = shapes[(step + 1) % shapes.length];
      const mix = Math.max(0, Math.min(1, eased));
      if (lastLabel !== a.name) { lastLabel = a.name; setShapeName(a.name); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2, cy = height / 2, outer = Math.min(width, height) * .43;
      const rotation = elapsed * .9 + (step + mix) * .55;
      const disc = new Path2D();
      disc.arc(cx, cy, outer, 0, TAU);
      const path = new Path2D();
      for (let i = 0; i < N; i++) {
        const radius = a.values[i] + (b.values[i] - a.values[i]) * mix;
        const angle = i / N * TAU + rotation;
        const r = outer * .69 * radius;
        const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
        if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
      }
      path.closePath();
      const container = ctx.createRadialGradient(cx - outer * .42, cy - outer * .5, 2, cx, cy, outer);
      container.addColorStop(0, "rgba(180,205,255,.16)");
      container.addColorStop(.58, "rgba(92,125,184,.10)");
      container.addColorStop(1, "rgba(9,18,34,.72)");
      ctx.fillStyle = container; ctx.fill(disc);
      ctx.lineWidth = 1.4; ctx.strokeStyle = "rgba(224,236,255,.28)"; ctx.stroke(disc);
      ctx.save(); ctx.clip(disc);
      const glow = ctx.createRadialGradient(cx - outer * .3, cy - outer * .38, 0, cx, cy, outer * 1.2);
      glow.addColorStop(0, "rgba(178,211,255,.18)"); glow.addColorStop(1, "rgba(110,145,205,0)");
      ctx.fillStyle = glow; ctx.fillRect(cx - outer, cy - outer, outer * 2, outer * 2);
      ctx.restore();
      const fill = ctx.createLinearGradient(cx - outer, cy - outer, cx + outer, cy + outer);
      fill.addColorStop(0, "rgba(245,250,255,.78)");
      fill.addColorStop(.35, "rgba(178,211,255,.48)");
      fill.addColorStop(.72, "rgba(132,163,220,.30)");
      fill.addColorStop(1, "rgba(235,244,255,.68)");
      ctx.save();
      ctx.shadowColor = "rgba(145,185,255,.32)"; ctx.shadowBlur = 18;
      ctx.fillStyle = fill; ctx.fill(path);
      ctx.restore();
      ctx.save(); ctx.lineWidth = outer * .035;
      const rim = ctx.createLinearGradient(cx - outer, cy - outer, cx + outer, cy + outer);
      rim.addColorStop(0, "rgba(255,255,255,.92)"); rim.addColorStop(.45, "rgba(255,255,255,.12)"); rim.addColorStop(1, "rgba(210,230,255,.78)");
      ctx.strokeStyle = rim; ctx.stroke(path);
      ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.stroke(path);
      ctx.restore();
      const dots = 3;
      for (let i = 0; i < dots; i++) {
        const angle = elapsed * 1.8 + i * TAU / dots;
        const x = cx + Math.cos(angle) * outer * 1.08, y = cy + Math.sin(angle) * outer * 1.08;
        ctx.beginPath(); ctx.arc(x, y, i === 0 ? 3.2 : 2.2, 0, TAU);
        ctx.fillStyle = "rgba(218,234,255,.9)"; ctx.shadowColor = "rgba(170,205,255,.8)"; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, []);
  return <div className="soft-loader" role="status" aria-live="polite">
    <div className="soft-loader-stage"><canvas ref={canvasRef} aria-hidden="true" /></div>
    <strong>{title}</strong><span className="soft-loader-shape-name">{shapeName}</span>
    <div className="soft-loader-status"><span>YÜKLENİYOR</span><i /><i /><i /></div>
    <small>{subtitle}</small>
  </div>;
}

function AnimatedOtpInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="zuno-otp" onClick={() => document.getElementById("zuno-otp-input")?.focus()}>
    <div className="zuno-otp-cells" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => <div className={value[index] ? "zuno-otp-cell filled" : "zuno-otp-cell"} key={index}>
        <span className="otp-liquid" />
        <strong>{value[index] ?? ""}</strong>
        {!value[index] && <i />}
      </div>)}
    </div>
    <input id="zuno-otp-input" className="zuno-otp-real-input" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={value} onChange={event => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} aria-label="6 haneli doğrulama kodu" />
  </div>;
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
  const [resendCooldown, setResendCooldown] = useState(0);
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
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

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
        if (result.user?.identities?.length === 0) {
          throw new Error("Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı dene.");
        }
        if (!result.session) {
          setPendingEmail(email.trim());
          setSignupOtp("");
          setResendCooldown(30);
          setAuthMessage("E-posta adresine gönderilen 6 haneli kodu aşağıya gir.");
        } else {
          setUser(result.user);
          setAuthOpen(false);
          setPassword("");
        }
      } else {
        const signedIn = await signInWithUsername(username, password);
        setUser(signedIn);
        setPendingEmail("");
        setSignupOtp("");
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
    try { await resendSignupOtp(pendingEmail); setResendCooldown(30); setAuthMessage("Kod gönderme isteği Supabase’e iletildi. Gelen kutunu ve spam klasörünü kontrol et."); }
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
        {loading ? <SoftLoader title="İkonlar yükleniyor" subtitle="Koleksiyon hazırlanıyor…" /> :
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
        {pendingEmail && authMode === "register" ? <form onSubmit={event => void handleVerifySignupOtp(event)} className="modal-form">
          <p className="otp-instructions"><strong>{pendingEmail}</strong> adresine gönderilen doğrulama kodunu gir. Gelen kutunu ve spam klasörünü kontrol et.</p>
          <AnimatedOtpInput value={signupOtp} onChange={setSignupOtp} />
          {authError && <p className="form-error" role="alert">{authError}</p>}{authMessage && <p className="form-success" role="status">{authMessage}</p>}
          <button className="button button-primary submit-button" disabled={authBusy || signupOtp.length !== 6}>{authBusy ? "Doğrulanıyor…" : "E-postayı doğrula"}</button>
          <button type="button" className="otp-resend" disabled={authBusy || resendCooldown > 0} onClick={() => void handleResendSignupOtp()}>{resendCooldown > 0 ? `Tekrar gönder · ${resendCooldown} sn` : "Kodu tekrar gönder"}</button>
          <button type="button" className="otp-resend" disabled={authBusy} onClick={() => { setPendingEmail(""); setSignupOtp(""); setResendCooldown(0); setAuthError(""); setAuthMessage(""); }}>E-posta adresini değiştir</button>
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
      {uploadBusy && <div className="upload-progress-overlay"><SoftLoader title="İkonun yükleniyor" subtitle="Tasarımın ZUNO topluluğuna ekleniyor…" /></div>}
    </main>
  );
}
