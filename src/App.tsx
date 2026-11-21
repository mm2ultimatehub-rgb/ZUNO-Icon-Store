import {useEffect,useState} from "react";
import {getIconPublicUrl,listIcons,type StoreIcon} from "./lib/iconStore";
import {supabaseReady} from "./lib/supabase";
export default function App(){
 const [icons,setIcons]=useState<StoreIcon[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 useEffect(()=>{if(!supabaseReady){setLoading(false);setError("Supabase bağlantısı henüz yapılandırılmadı.");return;}
 listIcons().then(setIcons).catch((reason:unknown)=>setError(reason instanceof Error?reason.message:"İkonlar yüklenemedi.")).finally(()=>setLoading(false));},[]);
 return <main className="starter"><header className="starter__header"><a className="starter__brand" href="./">ZUNO <span>ICON STORE</span></a><span className="starter__status">Community preview</span></header>
 <section className="starter__intro"><p className="starter__eyebrow">THE ZUNO ICON COMMUNITY</p><h1>Find your next<br/>home screen look.</h1><p>Discover community-made icons for ZUNO, or share a design of your own.</p></section>
 {error&&<p className="starter__notice">{error}</p>}{loading?<p>İkonlar yükleniyor…</p>:<section className="starter__grid" aria-label="Community icons">{icons.map(icon=><article className="starter__item" key={icon.id}><img src={getIconPublicUrl(icon.storage_path)} alt={icon.title} loading="lazy"/><strong>{icon.title}</strong><small>@{icon.profiles?.username??"creator"}</small></article>)}{!icons.length&&!error&&<p>Henüz paylaşılmış ikon yok. İlk tasarımı sen ekleyebilirsin.</p>}</section>}
 <footer className="starter__footer">ZUNO Icon Store · Community-powered icon collection</footer></main>;
}
