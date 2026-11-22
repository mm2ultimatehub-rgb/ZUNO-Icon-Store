import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { uploadIcon, type IconCategory } from "../lib/iconStore";
import { navigate } from "../lib/router";
import { CATEGORIES, formatSize, toMessage } from "../lib/storeApi";
import { useToast } from "../lib/toast";
import { EmptyState, GoButton } from "../components/ui";
import UploadWaveLoader from "../components/UploadWaveLoader";

const ACCEPT = "image/png,image/webp,image/svg+xml";

export default function Upload() {
  const { user, ready } = useAuth();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
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

  function pick(candidate: File | undefined) {
    setError("");
    if (!candidate) return;
    if (!ACCEPT.split(",").includes(candidate.type)) { setError("Yalnızca PNG, WebP veya SVG yükleyebilirsin."); return; }
    if (candidate.size > 10 * 1024 * 1024) { setError("Dosya boyutu en fazla 10 MB olabilir."); return; }
    setFile(candidate);
    if (!title) setTitle(candidate.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 60));
  }
  function onDrop(event: DragEvent) { event.preventDefault(); setDrag(false); pick(event.dataTransfer.files[0]); }
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) { setError("Önce bir ikon dosyası seç."); return; }
    setBusy(true); setError("");
    try {
      const row: unknown = await uploadIcon({ file, title, description, category });
      const id = row && typeof row === "object" && "id" in row ? String((row as { id: unknown }).id) : "";
      toast("İkon yüklendi."); navigate(id ? `/icon/${id}` : "/profile");
    } catch (reason) { setError(toMessage(reason)); setBusy(false); }
  }

  return <>
    <section className="authbox authbox--wide glass"><h1>İkon yükle</h1><p className="muted">PNG, WebP veya SVG · en fazla 10 MB</p>
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className={`drop ${drag ? "drop--over" : ""} ${preview ? "drop--has" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
          <button type="button" className="drop__btn" onClick={() => input.current?.click()}>{preview ? <img src={preview} alt="Seçilen ikon önizlemesi" /> : <span>Dosyayı buraya sürükle ya da <u>seç</u></span>}</button>
          <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        {file && <p className="muted small">{file.name} · {formatSize(file.size)}</p>}
        <label>İkon adı<input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Örn. Neon Dalga" required /></label>
        <label>Açıklama (isteğe bağlı)<textarea value={description} maxLength={500} rows={3} onChange={(e) => setDescription(e.target.value)} /></label>
        <label>Kategori<select className="select" value={category} onChange={(e) => setCategory(e.target.value as IconCategory)}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
        {error && <p className="form__error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--primary btn--wide" disabled={busy}>{busy ? "Yükleniyor…" : "Yükle ve paylaş"}</button>
      </form>
    </section>
    {busy && <div className="upload-progress-overlay"><UploadWaveLoader preview={preview} title={file?.name ?? title} /></div>}
  </>;
}
