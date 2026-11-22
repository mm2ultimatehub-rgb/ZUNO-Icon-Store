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
        <a className="brand" href="#/" aria-label="ZUNO Icon Store ana sayfa"><span className="brand__mark" aria-hidden="true"><img className="brand__logo" src="./zuno-logo.svg?v=2" alt="" /></span><span className="brand__text">ZUNO <em>Icon Store</em></span></a>
        <nav className="topnav" aria-label="Ana menü"><a className={is("home")} href="#/">Keşfet</a><a className={is("upload")} href="#/upload">Yükle</a>{isAdmin && <a className={is("admin")} href="#/admin">Yönetim</a>}</nav>
        <div className="topbar__end">
          {!ready ? <span className="shimmer chip-skel" /> : user ? <a className="btn btn--ghost btn--sm" href="#/profile"><span className="avatar">{(username ?? "?").slice(0, 1).toUpperCase()}</span><span className="hide-sm">@{username ?? "profil"}</span></a> : <><a className="btn btn--ghost btn--sm hide-sm" href="#/login">Giriş yap</a><a className="btn btn--primary btn--sm" href="#/register">Kayıt ol</a></>}
        </div>
      </header>
      <main className="page"><div className="route-view" key={route}>{children}</div></main>
      <footer className="footer"><img className="footer__logo" src="./zuno-logo.svg?v=2" alt="" /> <span>ZUNO Icon Store · Topluluğun ürettiği ikonlar</span></footer>
      <nav className="tabbar glass" aria-label="Alt menü">
        <a className={is("home")} href="#/"><NavIcon kind="home" /><span>Keşfet</span></a>
        <a className={is("upload")} href="#/upload"><NavIcon kind="upload" /><span>Yükle</span></a>
        <a className={is("profile")} href={profileHref}><NavIcon kind="user" /><span>{user ? "Profil" : "Giriş"}</span></a>
        {isAdmin && <a className={is("admin")} href="#/admin"><NavIcon kind="admin" /><span>Yönetim</span></a>}
      </nav>
    </div>
  );
}
