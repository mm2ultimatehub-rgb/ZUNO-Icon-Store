import { useState, type ReactNode } from "react";
import { navigate } from "../lib/router";
import { categoryLabel, type CatalogIcon } from "../lib/storeApi";

export function HeartIcon({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
}
export function DownloadIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
export function Spinner({ label }: { label?: string }) {
  return <span className="spinner" role="status" aria-label={label ?? "Yükleniyor"}><i /></span>;
}
export function IconImage({ icon, className }: { icon: Pick<CatalogIcon, "asset_url" | "title">; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`img-fallback ${className ?? ""}`}>?</div>;
  return <img className={className} src={icon.asset_url} alt={icon.title} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
export function IconCard({ icon, liked, onLike, index }: { icon: CatalogIcon; liked: boolean; onLike: (icon: CatalogIcon) => void; index: number }) {
  return (
    <article className="card glass" style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}>
      <a className="card__thumb" href={`#/icon/${icon.id}`} aria-label={`${icon.title} detayını aç`}><span className="card__glow" aria-hidden="true" /><IconImage icon={icon} /></a>
      <div className="card__body"><a className="card__title" href={`#/icon/${icon.id}`}>{icon.title}</a>
        <a className="card__by" href={`#/u/${encodeURIComponent(icon.username ?? "")}`} onClick={(e) => { if (!icon.username) e.preventDefault(); }}>@{icon.username ?? "bilinmiyor"}</a>
        <div className="card__meta"><span className="pill">{categoryLabel(icon.category)}</span><button type="button" className={`like ${liked ? "like--on" : ""}`} onClick={() => onLike(icon)} aria-pressed={liked} aria-label={liked ? "Beğeniyi kaldır" : "Beğen"}><HeartIcon filled={liked} /><span>{icon.like_count}</span></button></div>
      </div>
    </article>
  );
}
export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return <div className="grid" aria-busy="true" aria-label="İkonlar yükleniyor">{Array.from({ length: count }, (_, i) => <div className="card glass card--skeleton" key={i}><div className="card__thumb shimmer" /><div className="card__body"><span className="shimmer line line--lg" /><span className="shimmer line line--sm" /></div></div>)}</div>;
}
export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="empty glass"><div className="empty__art" aria-hidden="true"><span /><span /><span /></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="empty glass empty--error" role="alert"><div className="empty__art empty__art--error" aria-hidden="true"><span /><span /><span /></div><h3>İkonlar yüklenemedi</h3><p>{message}</p><button type="button" className="btn btn--primary" onClick={onRetry}>Tekrar dene</button></div>;
}
export function GoButton({ to, children, variant = "primary" }: { to: string; children: ReactNode; variant?: "primary" | "ghost" }) {
  return <button type="button" className={`btn btn--${variant}`} onClick={() => navigate(to)}>{children}</button>;
}
