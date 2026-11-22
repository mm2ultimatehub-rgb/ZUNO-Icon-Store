import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { EmptyState } from "../components/ui";
import SoftLoader from "../components/SoftLoader";

type TokenRow = { id:string; name:string; created_at:string; last_used_at:string|null };
type DraftRow = { id:string; title:string; description:string; category:string; mime_type:string; file_size:number; created_at:string };
const API_URL = "https://jlyinisqhkupddyfcdut.supabase.co/functions/v1/zuno-mcp-api";
async function hashToken(token:string) {
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
 return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,"0")).join("");
}
function newToken() {
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 let binary=""; bytes.forEach(v=>binary+=String.fromCharCode(v));
 return "zuno_mcp_"+btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function date(value:string|null) { return value ? new Date(value).toLocaleString("tr-TR") : "Henüz kullanılmadı"; }

export default function AIConnect() {
 const {user,ready}=useAuth();
 const [tokens,setTokens]=useState<TokenRow[]>([]);
 const [drafts,setDrafts]=useState<DraftRow[]>([]);
 const [name,setName]=useState("Benim AI bağlantım");
 const [freshToken,setFreshToken]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 async function load() {
  if(!supabase||!user)return;
  setLoading(true);setError("");
  const [t,d]=await Promise.all([
   supabase.from("zuno_mcp_tokens").select("id,name,created_at,last_used_at").order("created_at",{ascending:false}),
   supabase.functions.invoke("zuno-mcp-api",{body:{action:"list_drafts",input:{}}})
  ]);
  if(t.error)setError(t.error.message);else setTokens((t.data??[]) as TokenRow[]);
  if(d.error)setError(v=>v||d.error.message);else setDrafts((d.data?.drafts??[]) as DraftRow[]);
  setLoading(false);
 }
 useEffect(()=>{if(ready&&user)void load();else if(ready)setLoading(false);},[ready,user?.id]);

 async function create() {
  if(!supabase||!user)return;
  const label=name.trim();
  if(!label||label.length>48){setError("Bağlantı adı 1–48 karakter olmalı.");return;}
  setBusy(true);setError("");setNotice("");
  try {
   const raw=newToken(), tokenHash=await hashToken(raw);
   const {error:insertError}=await supabase.from("zuno_mcp_tokens").insert({user_id:user.id,name:label,token_hash:tokenHash});
   if(insertError)throw insertError;
   setFreshToken(raw);setNotice("Anahtar oluşturuldu. Güvenlik nedeniyle yalnızca şimdi gösteriliyor; güvenli bir yere kopyala.");
   await load();
  } catch(e){setError(e instanceof Error?e.message:"Anahtar oluşturulamadı.");}
  finally{setBusy(false);}
 }
 async function revoke(id:string) {
  if(!supabase||!window.confirm("Bu AI bağlantısını iptal etmek istediğine emin misin?"))return;
  setBusy(true);setError("");
  const {error:e}=await supabase.from("zuno_mcp_tokens").delete().eq("id",id);
  if(e)setError(e.message);else{setTokens(v=>v.filter(t=>t.id!==id));setNotice("Bağlantı anahtarı iptal edildi.");}
  setBusy(false);
 }
 async function draftAction(id:string,action:"publish_draft"|"delete_draft") {
  if(!supabase)return;
  if(!window.confirm(action==="publish_draft"?"Bu ikon herkese açık ZUNO mağazasında yayınlansın mı?":"Bu taslak kalıcı olarak silinsin mi?"))return;
  setBusy(true);setError("");setNotice("");
  try {
   const {data:{session}}=await supabase.auth.getSession();
   if(!session)throw new Error("Oturumun sona ermiş. Yeniden giriş yap.");
   const response=await fetch(API_URL,{method:"POST",headers:{"Authorization":`Bearer ${session.access_token}`,"apikey":"sb_publishable_sjwsqCho2mlpdzBUFQQ_dQ_2uBeSDwl","Content-Type":"application/json"},body:JSON.stringify({action,input:{draft_id:id}})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"İşlem tamamlanamadı.");
   setNotice(action==="publish_draft"?"İkon mağazada yayınlandı.":"Taslak silindi.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"İşlem başarısız.");}
  finally{setBusy(false);}
 }
 if(!ready)return null;
 if(!user)return <EmptyState title="AI Connect için giriş yap" text="ZUNO hesabına giriş yaparak kişisel AI bağlantı anahtarını oluşturabilirsin." />;
 if(loading)return <SoftLoader title="AI Connect hazırlanıyor" subtitle="Bağlantılar ve taslaklar yükleniyor"/>;
 return <div className="aiconnect">
  <section className="authbox authbox--wide glass">
   <div className="aiconnect__brand"><img src="./zuno-logo.svg" alt="ZUNO" /><div><div className="aiconnect__eyebrow">ZUNO · MODEL CONTEXT PROTOCOL</div><h1>AI Connect</h1></div></div>
   <p className="muted">Kullandığın AI uygulamasını ZUNO Icon Store'a bağla. AI mevcut ikonları arayabilir ve senin için özel ikon taslakları oluşturabilir.</p>
   <div className="aiconnect__endpoint"><span>MCP SERVER</span><code>https://zuno-icon-store-mcp.mm2ultimatehub.workers.dev/mcp</code><button className="btn btn--ghost btn--sm" type="button" onClick={()=>void navigator.clipboard.writeText("https://zuno-icon-store-mcp.mm2ultimatehub.workers.dev/mcp")}>Adresi kopyala</button></div>
   <h2>Kişisel bağlantı anahtarı</h2>
   <p className="muted small">Her AI istemcisi için ayrı anahtar oluştur. Anahtar yalnızca oluşturulduğunda gösterilir; kaybedersen iptal edip yenisini oluştur.</p>
   <div className="form"><label>Bağlantı adı<input value={name} maxLength={48} onChange={e=>setName(e.target.value)} placeholder="Örn. Claude" /></label><button className="btn btn--primary" type="button" disabled={busy} onClick={()=>void create()}>{busy?"Oluşturuluyor…":"Yeni bağlantı anahtarı oluştur"}</button></div>
   {freshToken&&<div className="aiconnect__token"><strong>Yeni anahtarın — şimdi kopyala</strong><code>{freshToken}</code><button className="btn btn--primary btn--sm" type="button" onClick={()=>void navigator.clipboard.writeText(freshToken)}>Anahtarı kopyala</button></div>}
   {notice&&<p className="aiconnect__notice" role="status">{notice}</p>}{error&&<p className="form__error" role="alert">{error}</p>}
   <h2>Bağlı AI uygulamaları</h2>
   {tokens.length===0?<p className="muted small">Henüz bağlantı anahtarı oluşturmadın.</p>:<div className="aiconnect__list">{tokens.map(t=><div className="aiconnect__item" key={t.id}><div><strong>{t.name}</strong><small>Oluşturuldu: {date(t.created_at)} · Son kullanım: {date(t.last_used_at)}</small></div><button className="btn btn--danger btn--sm" disabled={busy} onClick={()=>void revoke(t.id)}>İptal et</button></div>)}</div>}
   <div className="aiconnect__guide"><strong>Bağlantı ayarları</strong><p>AI uygulaman MCP destekliyorsa uzak sunucu olarak yukarıdaki adresi ekle. Kimlik doğrulamada Bearer token seçip oluşturduğun ZUNO anahtarını kullan. İstemcinin Streamable HTTP desteği olmalı.</p></div>
  </section>
  <section className="authbox authbox--wide glass">
   <h2>AI tarafından oluşturulan taslaklar</h2><p className="muted small">AI'nın gönderdiği ikonlar yalnızca sana görünür. Buradan onaylayıp mağazada yayınlayabilir veya silebilirsin.</p>
   {drafts.length===0?<p className="muted small">Henüz AI taslağın yok. Bağladığın AI'ya bir ikon oluşturmasını söyleyebilirsin.</p>:<div className="aiconnect__list">{drafts.map(d=><div className="aiconnect__item" key={d.id}><div><strong>{d.title}</strong><small>{d.category} · {(d.file_size/1024).toFixed(0)} KB · {date(d.created_at)}</small><small>{d.description||"Açıklama yok"}</small></div><div className="row"><button className="btn btn--primary btn--sm" disabled={busy} onClick={()=>void draftAction(d.id,"publish_draft")}>Yayınla</button><button className="btn btn--danger btn--sm" disabled={busy} onClick={()=>void draftAction(d.id,"delete_draft")}>Sil</button></div></div>)}</div>}
  </section>
 </div>;
}
