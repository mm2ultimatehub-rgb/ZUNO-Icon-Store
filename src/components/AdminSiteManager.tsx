import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { requireSupabase } from "../lib/supabase";
import { toMessage } from "../lib/storeApi";
import { useToast } from "../lib/toast";
import { DEFAULT_SITE_CONFIG, useSiteConfig, type SiteConfig } from "../lib/siteConfig";

type Section=keyof SiteConfig;
const SECTIONS:{id:Section;label:string;description:string}[]=[
 {id:"brand",label:"Marka & duyuru",description:"Site adı, logo ve üst duyuru alanı"},
 {id:"navigation",label:"Menü",description:"Gezinme bağlantıları ve görünürlük"},
 {id:"home",label:"Ana sayfa",description:"Karşılama alanı, butonlar ve bölüm görünürlüğü"},
 {id:"download",label:"APK sayfası",description:"Uygulama tanıtımı, indirme bağlantısı ve özellikler"},
 {id:"about",label:"Hakkımızda",description:"Hakkımızda sayfasının tüm metinleri"},
 {id:"appearance",label:"Görünüm",description:"Sitenin vurgu renkleri"},
 {id:"footer",label:"Alt bilgi",description:"Alt bilgi metni ve iletişim bağlantısı"}
];
function Field({label,value,onChange,placeholder="",maxLength=180}:{label:string;value:string;onChange:(value:string)=>void;placeholder?:string;maxLength?:number}){
 return <label className="site-editor__field"><span>{label}</span><input value={value} maxLength={maxLength} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>;
}
function Area({label,value,onChange,maxLength=700}:{label:string;value:string;onChange:(value:string)=>void;maxLength?:number}){
 return <label className="site-editor__field"><span>{label}</span><textarea value={value} maxLength={maxLength} rows={3} onChange={e=>onChange(e.target.value)}/></label>;
}
function Toggle({label,description,checked,onChange}:{label:string;description:string;checked:boolean;onChange:(value:boolean)=>void}){
 return <label className="site-editor__toggle"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/></label>;
}
export default function AdminSiteManager(){
 const {user}=useAuth();const toast=useToast();const {config,setConfig}=useSiteConfig();
 const [draft,setDraft]=useState<SiteConfig>(config);const [section,setSection]=useState<Section>("brand");
 const [saving,setSaving]=useState(false);const [lastSaved,setLastSaved]=useState("");
 useEffect(()=>setDraft(config),[config]);
 const dirty=JSON.stringify(draft)!==JSON.stringify(config);
 function patch(group:Section,key:string,value:string|boolean){
  setDraft(current=>({...current,[group]:{...(current[group] as unknown as Record<string,unknown>),[key]:value}} as SiteConfig));
 }
 function patchFeature(index:number,key:"title"|"description",value:string){
  setDraft(current=>({...current,download:{...current.download,features:current.download.features.map((item,i)=>i===index?{...item,[key]:value}:item)}}));
 }
 function validHttps(value:string,label:string){
  if(!value.trim())return true;
  if(label==="Logo adresi"&&(value.startsWith("./")||value.startsWith("/")))return true;
  try{const url=new URL(value);if(url.protocol!=="https:")throw new Error();return true;}catch{toast(label+" geçerli bir HTTPS bağlantısı olmalı.","error");return false;}
 }
 async function save(){
  if(!user)return;
  if(!validHttps(draft.brand.logoUrl,"Logo adresi")||!validHttps(draft.download.apkUrl,"APK adresi")||!validHttps(draft.footer.githubUrl,"İletişim adresi")||!validHttps(draft.announcement.linkUrl,"Duyuru bağlantısı")||!validHttps(draft.about.contactUrl,"Hakkımızda iletişim adresi"))return;
  if(!/^#[0-9a-f]{6}$/i.test(draft.appearance.primary)||!/^#[0-9a-f]{6}$/i.test(draft.appearance.cyan)||!/^#[0-9a-f]{6}$/i.test(draft.appearance.pink)){toast("Renkler #RRGGBB biçiminde olmalı.","error");return;}
  if(draft.announcement.enabled&&!draft.announcement.text.trim()){toast("Duyuruyu açmadan önce duyuru metnini yaz.","error");return;}
  setSaving(true);
  try{
   const {error}=await requireSupabase().from("zuno_site_config").upsert({id:"main",config:draft,updated_by:user.id,updated_at:new Date().toISOString()});
   if(error)throw error;
   setConfig(draft);setLastSaved(new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}));toast("Site ayarları kaydedildi ve yayınlandı.");
  }catch(reason){toast(toMessage(reason),"error");}
  finally{setSaving(false);}
 }
 function reset(){
  if(!window.confirm("Bu bölümdeki değişiklikleri varsayılan ZUNO ayarlarına döndürmek istiyor musun?"))return;
  setDraft(current=>({...current,[section]:DEFAULT_SITE_CONFIG[section]}));
 }
 const current= draft[section] as unknown as Record<string,unknown>;
 const text=(key:string)=>String(current[key]??"");
 const bool=(key:string)=>Boolean(current[key]);
 return <section className="site-editor glass">
  <div className="site-editor__heading"><div><p className="eyebrow">KOLAY YÖNETİM</p><h2>Siteyi düzenle</h2><p className="muted">Listeden bir bölüm seç, değiştir ve kaydet. Değişiklikler siteye uygulanır.</p></div><span className={dirty?"site-editor__state is-dirty":"site-editor__state"}>{dirty?"Kaydedilmemiş":"Her şey güncel"}</span></div>
  <div className="site-editor__layout">
   <label className="site-editor__section-picker"><span>Hangi bölümü düzenlemek istiyorsun?</span><select value={section} onChange={event=>setSection(event.target.value as Section)}>{SECTIONS.map(item=><option key={item.id} value={item.id}>{item.label} — {item.description}</option>)}</select></label>
   <div className="site-editor__content">
    {section==="brand"&&<><div className="site-editor__section-title"><h3>Marka ve duyuru</h3><p>Üst menüde görünen kimliği ve ziyaretçilere gösterilen duyuruyu düzenle.</p></div><Field label="Site adı" value={text("siteName")} onChange={v=>patch("brand","siteName",v)} maxLength={35}/><Field label="Site alt başlığı" value={text("subtitle")} onChange={v=>patch("brand","subtitle",v)} maxLength={45}/><Field label="Logo görseli HTTPS adresi" value={text("logoUrl")} onChange={v=>patch("brand","logoUrl",v)} placeholder="https://.../logo.svg" maxLength={500}/><div className="site-editor__subhead">Duyuru bandı</div><Toggle label="Duyuruyu göster" description="Açıldığında üst menünün altında görünür." checked={bool("enabled")} onChange={v=>patch("announcement","enabled",v)}/><Area label="Duyuru metni" value={text("text")} onChange={v=>patch("announcement","text",v)} maxLength={220}/><Field label="Bağlantı butonu yazısı (isteğe bağlı)" value={text("linkLabel")} onChange={v=>patch("announcement","linkLabel",v)} maxLength={45}/><Field label="Bağlantı adresi (HTTPS)" value={text("linkUrl")} onChange={v=>patch("announcement","linkUrl",v)} maxLength={500}/></>}
    {section==="navigation"&&<><div className="site-editor__section-title"><h3>Menü ve gezinme</h3><p>Hangi sayfaların menüde görüneceğini ve bağlantı adlarını seç.</p></div><Toggle label="Uygulama bağlantısı" description="İndirme sayfasını menüde göster." checked={bool("showDownload")} onChange={v=>patch("navigation","showDownload",v)}/><Field label="Uygulama menü yazısı" value={text("downloadLabel")} onChange={v=>patch("navigation","downloadLabel",v)} maxLength={30}/><Toggle label="Hakkımızda bağlantısı" description="Hakkımızda sayfasını menüde göster." checked={bool("showAbout")} onChange={v=>patch("navigation","showAbout",v)}/><Field label="Hakkımızda menü yazısı" value={text("aboutLabel")} onChange={v=>patch("navigation","aboutLabel",v)} maxLength={30}/><Toggle label="Yükleme bağlantısı" description="İkon yükleme sayfasını menüde göster." checked={bool("showUpload")} onChange={v=>patch("navigation","showUpload",v)}/><Field label="Yükleme menü yazısı" value={text("uploadLabel")} onChange={v=>patch("navigation","uploadLabel",v)} maxLength={30}/><Field label="Keşfet menü yazısı" value={text("discoverLabel")} onChange={v=>patch("navigation","discoverLabel",v)} maxLength={30}/></>}
    {section==="home"&&<><div className="site-editor__section-title"><h3>Ana sayfa</h3><p>İlk ekranda ziyaretçilerin gördüğü metinleri ve bölümleri düzenle.</p></div><Toggle label="Karşılama alanını göster" description="Ana sayfanın büyük başlık ve buton alanı." checked={bool("showHero")} onChange={v=>patch("home","showHero",v)}/><Toggle label="İkon galerisini göster" description="Arama, filtre ve topluluk ikonlarını göster." checked={bool("showGallery")} onChange={v=>patch("home","showGallery",v)}/><Toggle label="Tanıtım videosunu göster" description="Yayınlanmış tanıtım videosunu ana sayfada göster." checked={bool("showPromoVideo")} onChange={v=>patch("home","showPromoVideo",v)}/><Field label="Üst küçük başlık" value={text("eyebrow")} onChange={v=>patch("home","eyebrow",v)}/><Field label="Ana başlık" value={text("title")} onChange={v=>patch("home","title",v)}/><Field label="Vurgulu başlık" value={text("highlight")} onChange={v=>patch("home","highlight",v)}/><Area label="Açıklama" value={text("description")} onChange={v=>patch("home","description",v)}/><div className="site-editor__subhead">Birincil buton</div><Field label="Buton yazısı" value={text("primaryLabel")} onChange={v=>patch("home","primaryLabel",v)} maxLength={45}/><Field label="Site içi adres (ör. /upload)" value={text("primaryHref")} onChange={v=>patch("home","primaryHref",v)} maxLength={120}/><div className="site-editor__subhead">İkincil buton</div><Field label="Buton yazısı" value={text("secondaryLabel")} onChange={v=>patch("home","secondaryLabel",v)} maxLength={45}/><Field label="Site içi adres (ör. /download)" value={text("secondaryHref")} onChange={v=>patch("home","secondaryHref",v)} maxLength={120}/></>}
    {section==="download"&&<><div className="site-editor__section-title"><h3>APK indirme sayfası</h3><p>İndirme sayfasının başlığını, açıklamasını ve doğrudan APK bağlantısını yönet.</p></div><Field label="Üst küçük başlık" value={text("eyebrow")} onChange={v=>patch("download","eyebrow",v)}/><Field label="Ana başlık" value={text("title")} onChange={v=>patch("download","title",v)}/><Field label="Vurgulu başlık" value={text("highlight")} onChange={v=>patch("download","highlight",v)}/><Area label="Açıklama" value={text("description")} onChange={v=>patch("download","description",v)}/><Field label="İndirme butonu yazısı" value={text("buttonLabel")} onChange={v=>patch("download","buttonLabel",v)} maxLength={50}/><Field label="İndirme butonu alt yazısı" value={text("buttonHint")} onChange={v=>patch("download","buttonHint",v)} maxLength={90}/><Area label="İndirme güvenlik notu" value={text("safeNote")} onChange={v=>patch("download","safeNote",v)} maxLength={350}/><Field label="Sürümler bağlantısı yazısı" value={text("releaseLabel")} onChange={v=>patch("download","releaseLabel",v)} maxLength={90}/><Field label="Kurulum notu başlığı" value={text("installTitle")} onChange={v=>patch("download","installTitle",v)} maxLength={60}/><Area label="Kurulum açıklaması" value={text("installDescription")} onChange={v=>patch("download","installDescription",v)} maxLength={400}/><Field label="Özel APK bağlantısı (boşsa son GitHub sürümü)" value={text("apkUrl")} onChange={v=>patch("download","apkUrl",v)} placeholder="https://..." maxLength={500}/><div className="site-editor__subhead">Özellik kartları</div>{draft.download.features.map((feature,index)=><div className="site-editor__feature" key={index}><strong>Özellik {index+1}</strong><Field label="Başlık" value={feature.title} onChange={v=>patchFeature(index,"title",v)} maxLength={70}/><Area label="Açıklama" value={feature.description} onChange={v=>patchFeature(index,"description",v)} maxLength={260}/></div>)}</>}
    {section==="about"&&<><div className="site-editor__section-title"><h3>Hakkımızda içeriği</h3><p>Hakkımızda sayfasındaki başlıkları, uygulama ve topluluk açıklamalarını düzenle.</p></div><Field label="Üst küçük başlık" value={text("eyebrow")} onChange={v=>patch("about","eyebrow",v)}/><Field label="Ana başlık" value={text("title")} onChange={v=>patch("about","title",v)}/><Field label="Vurgulu başlık" value={text("highlight")} onChange={v=>patch("about","highlight",v)}/><Area label="Giriş açıklaması" value={text("description")} onChange={v=>patch("about","description",v)}/><Field label="Değerler bölümünün küçük başlığı" value={text("valuesEyebrow")} onChange={v=>patch("about","valuesEyebrow",v)}/><div className="site-editor__subhead">Uygulama kartı</div><Field label="Kart başlığı" value={text("appTitle")} onChange={v=>patch("about","appTitle",v)}/><Area label="Kart açıklaması" value={text("appDescription")} onChange={v=>patch("about","appDescription",v)}/><Field label="Kart bağlantı yazısı" value={text("appLinkLabel")} onChange={v=>patch("about","appLinkLabel",v)} maxLength={80}/><div className="site-editor__subhead">Topluluk kartı</div><Field label="Kart başlığı" value={text("communityTitle")} onChange={v=>patch("about","communityTitle",v)}/><Area label="Kart açıklaması" value={text("communityDescription")} onChange={v=>patch("about","communityDescription",v)}/><Field label="Kart bağlantı yazısı" value={text("communityLinkLabel")} onChange={v=>patch("about","communityLinkLabel",v)} maxLength={80}/><div className="site-editor__subhead">Değerler bölümü</div><Field label="Bölüm başlığı" value={text("valuesTitle")} onChange={v=>patch("about","valuesTitle",v)}/>{[1,2,3].map((n)=> <div className="site-editor__feature" key={n}><Field label={n+". değer başlığı"} value={text("value"+(n===1?"One":n===2?"Two":"Three")+"Title")} onChange={v=>patch("about","value"+(n===1?"One":n===2?"Two":"Three")+"Title",v)} maxLength={65}/><Area label={n+". değer açıklaması"} value={text("value"+(n===1?"One":n===2?"Two":"Three")+"Description")} onChange={v=>patch("about","value"+(n===1?"One":n===2?"Two":"Three")+"Description",v)} maxLength={220}/></div>) }<div className="site-editor__subhead">İletişim alanı</div><Field label="İletişim metni" value={text("contactLabel")} onChange={v=>patch("about","contactLabel",v)} maxLength={90}/><Field label="İletişim bağlantı yazısı" value={text("contactLinkLabel")} onChange={v=>patch("about","contactLinkLabel",v)} maxLength={90}/><Field label="İletişim URL (HTTPS)" value={text("contactUrl")} onChange={v=>patch("about","contactUrl",v)} maxLength={500}/></>}
    {section==="appearance"&&<><div className="site-editor__section-title"><h3>Renk sistemi</h3><p>Renkleri değiştir; butonlar, vurgular ve arka plan ışıkları site genelinde güncellensin.</p></div>{([{key:"primary",label:"Ana vurgu"},{key:"cyan",label:"İkincil vurgu"},{key:"pink",label:"Üçüncü vurgu"}] as const).map(item=><label className="site-editor__color" key={item.key}><span>{item.label}</span><input type="color" value={text(item.key)} onChange={e=>patch("appearance",item.key,e.target.value)}/><code>{text(item.key)}</code></label>)}</>}
    {section==="footer"&&<><div className="site-editor__section-title"><h3>Alt bilgi</h3><p>Sitenin en altındaki açıklama ve iletişim bağlantısını değiştir.</p></div><Field label="Alt bilgi metni" value={text("text")} onChange={v=>patch("footer","text",v)} maxLength={100}/><Field label="GitHub / iletişim bağlantısı (HTTPS)" value={text("githubUrl")} onChange={v=>patch("footer","githubUrl",v)} maxLength={500}/></>}
    <div className="site-editor__actions"><button className="btn btn--primary" type="button" disabled={!dirty||saving} onClick={()=>void save()}>{saving?"Kaydediliyor…":"Değişiklikleri kaydet ve yayınla"}</button><button className="btn btn--ghost" type="button" disabled={saving} onClick={reset}>Bu bölümü varsayılana döndür</button>{lastSaved&&<small>Son kayıt: {lastSaved}</small>}</div>
   </div>
  </div>
 </section>;
}
