import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { resolvePinterestImage, uploadExternalIcon, uploadIcon, type IconCategory, type ResolvedPinterestImage } from "../lib/iconStore";
import { navigate } from "../lib/router";
import { CATEGORIES, formatSize, toMessage } from "../lib/storeApi";
import { useToast } from "../lib/toast";
import { EmptyState, GoButton } from "../components/ui";
import UploadWaveLoader from "../components/UploadWaveLoader";

const ACCEPT = "image/png,image/jpeg,.jpg,.jpeg,image/webp,image/svg+xml";
const MAX_FILE_SIZE = 40 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export default function Upload() {
  const { user, ready } = useAuth();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [imageLink, setImageLink] = useState("");
  const [linkLoaded, setLinkLoaded] = useState(false);
  const [resolvedLink, setResolvedLink] = useState<ResolvedPinterestImage | null>(null);
  const [resolvingLink, setResolvingLink] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<IconCategory>("Minimal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!ready) return null;
  if (!user) return <EmptyState title="Yüklemek için giriş yap" text="İkonlarını paylaşmak için bir hesaba ihtiyacın var." action={<div className="row row--center"><GoButton to="/login">Giriş yap</GoButton><GoButton to="/register" variant="ghost">Kayıt ol</GoButton></div>} />;

  function isPinterestUrl(value: string) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && (url.hostname === "pin.it" || url.hostname === "pinterest.com" || url.hostname.endsWith(".pinterest.com"));
    } catch { return false; }
  }

  function pick(candidate: File | undefined) {
    setError("");
    if (!candidate) return;
    if (!ALLOWED_TYPES.includes(candidate.type)) { setError("Yalnızca PNG, JPG, JPEG, WebP veya SVG yükleyebilirsin."); return; }
    if (candidate.size > MAX_FILE_SIZE) { setError("Dosya boyutu en fazla 40 MB olabilir."); return; }
    setFile(candidate);
    setImageLink("");
    setLinkLoaded(false);
    setResolvedLink(null);
    if (!title) setTitle(candidate.name.replace(/\\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 60));
  }

  function changeLink(value: string) {
    setImageLink(value);
    setFile(null);
    setLinkLoaded(false);
    setResolvedLink(null);
    setError("");
    if (!title && value.trim()) {
      try {
        const parsed = new URL(value.trim());
        const name = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? "Paylaşılan görsel");
        setTitle(name.replace(/\\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 60));
      } catch { /* Kullanıcı bağlantıyı yazmaya devam ediyor. */ }
    }
  }

  function onDrop(event: DragEvent) { event.preventDefault(); setDrag(false); pick(event.dataTransfer.files[0]); }

  async function previewLink() {
    const value = imageLink.trim();
    if (!value) return;
    setError("");
    if (isPinterestUrl(value)) {
      setResolvingLink(true);
      try {
        const resolved = await resolvePinterestImage(value);
        setResolvedLink(resolved);
        setLinkLoaded(false);
      } catch (reason) {
        setResolvedLink(null);
        setError(toMessage(reason));
      } finally {
        setResolvingLink(false);
      }
      return;
    }
    setResolvedLink(null);
    setLinkLoaded(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!file && imageLink.trim() && isPinterestUrl(imageLink.trim())) {
        const resolved = resolvedLink ?? await resolvePinterestImage(imageLink.trim());
        const row: unknown = await uploadExternalIcon({
          sourceUrl: resolved.sourceUrl || imageLink.trim(),
          imageUrl: resolved.imageUrl,
          title,
          description,
          category,
        });
        const id = row && typeof row === "object" && "id" in row ? String((row as { id: unknown }).id) : "";
        toast("Pinterest bağlantısı paylaşıldı. Görsel dosyası depolanmadı.");
        navigate(id ? `/icon/${id}` : "/profile");
        return;
      }

      let uploadFile = file;
      if (!uploadFile && imageLink.trim()) {
        let parsed: URL;
        try { parsed = new URL(imageLink.trim()); } catch { throw new Error("Geçerli bir görsel bağlantısı gir."); }
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Yalnızca HTTP veya HTTPS bağlantıları desteklenir.");
        const response = await fetch(parsed.href, { mode: "cors", credentials: "omit" });
        if (!response.ok) throw new Error("Görsel bağlantısından dosya alınamadı. Doğrudan görsel adresi kullan veya sunucunun erişime izin verdiğini kontrol et.");
        const blob = await response.blob();
        const mime = (blob.type || response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
        if (!ALLOWED_TYPES.includes(mime)) throw new Error("Bağlantı PNG, WebP veya SVG görseli döndürmüyor. Pinterest için pin.it bağlantısını kullan.");
        if (blob.size === 0 || blob.size > MAX_FILE_SIZE) throw new Error("Görsel boş veya 40 MB sınırını aşıyor.");
        const extension = mime === "image/svg+xml" ? "svg" : mime === "image/webp" ? "webp" : mime === "image/jpeg" ? "jpg" : "png";
        uploadFile = new File([blob], `zuno-link-image.${extension}`, { type: mime });
      }
      if (!uploadFile) throw new Error("Önce bir dosya seç veya görsel bağlantısı ekle.");
      const row: unknown = await uploadIcon({ file: uploadFile, title, description, category });
      const id = row && typeof row === "object" && "id" in row ? String((row as { id: unknown }).id) : "";
      toast("İkon yüklendi.");
      navigate(id ? `/icon/${id}` : "/profile");
    } catch (reason) {
      setError(toMessage(reason));
      setBusy(false);
    }
  }

  const imageSource = preview || resolvedLink?.imageUrl || (linkLoaded ? imageLink.trim() : "");

  return <>
    <section className="authbox authbox--wide glass"><h1>İkon yükle</h1><p className="muted">PNG, JPG, JPEG, WebP veya SVG · en fazla 40 MB</p>
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className={`drop ${drag ? "drop--over" : ""} ${imageSource ? "drop--has" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
          <button type="button" className="drop__btn" onClick={() => input.current?.click()}>{imageSource ? <img src={imageSource} alt="Görsel önizlemesi" /> : <span>Dosyayı buraya sürükle ya da <u>seç</u></span>}</button>
          <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        {file && <p className="muted small">{file.name} · {formatSize(file.size)}</p>}
        <label>Bağlantıdan görsel ekle<input type="url" value={imageLink} onChange={(e) => changeLink(e.target.value)} onBlur={() => { if (imageLink.trim() && !isPinterestUrl(imageLink.trim())) setLinkLoaded(true); }} placeholder="https://pin.it/... veya https://.../gorsel.png" autoComplete="url" /></label>
        <p className="muted small">Pinterest pin bağlantısı veya doğrudan görsel adresi ekleyebilirsin. Pinterest görselleri dosya olarak Supabase depolamasına kopyalanmaz.</p>
        {imageLink.trim() && <button type="button" className="btn btn--ghost btn--wide" disabled={resolvingLink} onClick={previewLink}>{resolvingLink ? "Pinterest görseli bulunuyor…" : isPinterestUrl(imageLink.trim()) ? "Pinterest görselini önizle" : "Bağlantıyı önizle"}</button>}
        <label>İkon adı<input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Örn. Neon Dalga" required /></label>
        <label>Açıklama (isteğe bağlı)<textarea value={description} maxLength={500} rows={3} onChange={(e) => setDescription(e.target.value)} /></label>
        <label>Kategori<select className="select" value={category} onChange={(e) => setCategory(e.target.value as IconCategory)}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
        {error && <p className="form__error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--primary btn--wide" disabled={busy}>{busy ? "Yükleniyor…" : "Yükle ve paylaş"}</button>
      </form>
    </section>
    {busy && <div className="upload-progress-overlay"><UploadWaveLoader preview={imageSource} title={file?.name ?? title} /></div>}
  </>;
}
