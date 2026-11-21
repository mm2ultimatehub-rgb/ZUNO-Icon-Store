import {useEffect,useState} from "react";
import {listIcons,type StoreIcon} from "./lib/iconStore";
import {supabaseReady} from "./lib/supabase";
export default function App(){
 const [icons,setIcons]=useState<StoreIcon[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  if(!supabaseReady){setLoading(false);setError("Supabase bağlantısı yapılandırılmamış.");return;}
  const timeout=window.setTimeout(()=>{if(active){setLoading(false);setError("Sunucu yanıt vermedi. İnternet bağlantını kontrol edip yeniden dene.");}},12000);
  listIcons().then(data=>{if(active)setIcons(data);}).catch((reason:unknown)=>{if(active)setError(reason instanceof Error?reason.message:"İkonlar yüklenemedi.");}).finally(()=>{window.clearTimeout(timeout);if(active)setLoading(false);});
  return ()=>{active=false;window.clearTimeout(timeout);};
 },[]);
 return <main className="starter"><header className="starter__header"><a className="starter__brand" href="./">ZUNO <span>ICON STORE</span></a><span className="starter__status">Community preview</span></header>
 <section className="starter__intro"><p className="starter__eyebrow">THE ZUNO ICON COMMUNITY</p><h1>Find your next<br/>home screen look.</h1><p>Discover community-made icons for ZUNO, or share a design of your own.</p></section>
 {error&&<div className="starter__notice" role="alert"><p>{error}</p><button type="button" onClick={()=>window.location.reload()}>Yeniden dene</button></div>}
 {loading?<p role="status">İkonlar yükleniyor…</p>:<section className="starter__grid" aria-label="Community icons">{icons.map(icon=><article className="starter__item" key={icon.id}><img src={icon.asset_url} alt={icon.title} loading="lazy"/><strong>{icon.title}</strong><small>@{icon.username??"creator"} · {icon.like_count??0} beğeni</small></article>)}{!icons.length&&!error&&<p>Henüz paylaşılmış ikon yok. İlk tasarımı sen ekleyebilirsin.</p>}</section>}
 <footer className="starter__footer">ZUNO Icon Store · Community-powered icon collection</footer></main>;
}