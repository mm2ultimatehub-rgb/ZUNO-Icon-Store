import type { ReactNode } from "react";
import { useAuth } from "../lib/auth";

function NavIcon({ kind }: { kind: "home" | "upload" | "user" | "admin" }) {
  const d = kind === "home" ? "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1v-7.5Z" : kind === "upload" ? "M12 16V5m0 0L8 9m4-4 4 4M5 19h14" : kind === "admin" ? "M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Zm-3.5 9 2.3 2.3 4.8-5" : "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0";
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Shell({ route, children }: { route: string; children: ReactNode }) {
  const { user, username, isAdmin, ready } = useAuth();
  const profileHref = user ? "#/profile" : "#/login";
  const is = (name: string) => (route === name ? "is-active" : undefined);
  return (
    <div className="shell">
      <div className="aurora" aria-hidden="true"><i className="orb orb--a" /><i className="orb orb--b" /><i className="orb orb--c" /></div>
      <header className="topbar glass">
        <a className="brand" href="#/" aria-label="ZUNO Icon Store ana sayfa"><span className="brand__mark" aria-hidden="true"><svg className="brand__logo" viewBox="0 0 100 100" role="img" aria-label="ZUNO"><defs><linearGradient id="zuno-ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset=".32" stopColor="#dcecff"/><stop offset=".68" stopColor="#829bb8"/><stop offset="1" stopColor="#f7fbff"/></linearGradient><linearGradient id="zuno-wave" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset=".5" stopColor="#b8cce2"/><stop offset="1" stopColor="#738aa7"/></linearGradient></defs><circle cx="50" cy="50" r="43" fill="none" stroke="url(#zuno-ice)" strokeWidth="6.5"/><circle cx="50" cy="50" r="38.5" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.2"/><path d="M8 52 C20 73 25 28 36 51 S50 78 59 49 S74 26 83 50 S94 67 96 48" fill="none" stroke="url(#zuno-wave)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 48 C20 69 25 24 36 47 S50 74 59 45 S74 22 83 46 S94 63 96 44" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round"/></svg></span><span className="brand__text">ZUNO <em>Icon Store</em></span></a>
        <nav className="topnav" aria-label="Ana menü"><a className={is("home")} href="#/">Keşfet</a><a className={is("upload")} href="#/upload">Yükle</a>{isAdmin && <a className={is("admin")} href="#/admin">Yönetim</a>}</nav>
        <div className="topbar__end">
          {!ready ? <span className="shimmer chip-skel" /> : user ? <a className="btn btn--ghost btn--sm" href="#/profile"><span className="avatar">{(username ?? "?").slice(0, 1).toUpperCase()}</span><span className="hide-sm">@{username ?? "profil"}</span></a> : <><a className="btn btn--ghost btn--sm hide-sm" href="#/login">Giriş yap</a><a className="btn btn--primary btn--sm" href="#/register">Kayıt ol</a></>}
        </div>
      </header>
      <main className="page"><div className="route-view" key={route}>{children}</div></main>
      <footer className="footer">ZUNO Icon Store · Topluluğun ürettiği ikonlar</footer>
      <nav className="tabbar glass" aria-label="Alt menü">
        <a className={is("home")} href="#/"><NavIcon kind="home" /><span>Keşfet</span></a>
        <a className={is("upload")} href="#/upload"><NavIcon kind="upload" /><span>Yükle</span></a>
        <a className={is("profile")} href={profileHref}><NavIcon kind="user" /><span>{user ? "Profil" : "Giriş"}</span></a>
        {isAdmin && <a className={is("admin")} href="#/admin"><NavIcon kind="admin" /><span>Yönetim</span></a>}
      </nav>
    </div>
  );
}
