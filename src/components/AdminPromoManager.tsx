import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import { requireSupabase } from "../lib/supabase";
import { toMessage } from "../lib/storeApi";
import { useToast } from "../lib/toast";
import { promoEmbedUrl, promoPublicUrl, type PromoSettings } from "../lib/promo";
const MAX_VIDEO_BYTES=40*1024*1024;
const ALLOWED_TYPES=["video/mp4","video/webm","video/quicktime"];
export default function AdminPromoManager(){
 const {user}=useAuth();const toast=useToast();
 const [promo,setPromo]=useState<PromoSettings|null>(null);
 const [title,setTitle]=useState("ZUNO Icon Store");const [description,setDescription]=useState("");
 const [sourceMode,setSourceMode]=useState<"upload"|"url">("upload");const [videoUrl,setVideoUrl]=useState("");
 const [file,setFile]=useState<File|null>(null);const [published,setPublished]=useState(false);
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState("");
 useEffect(()=>{let alive=true;Promise.resolve(requireSupabase().from("zuno_site_promo").select("id,title,description,video_url,storage_path,is_published,updated_at").eq("id","main").maybeSingle())
 .then(({data,error:queryError})=>{if(!alive)return;if(queryError){setError(toMessage(queryError));return;}const row=data as PromoSettings|null;if(row){setPromo(row);setTitle(row.title);setDescription(row.description);setVideoUrl(row.video_url??"");setSourceMode(row.video_url?"url":"upload");setPublished(row.is_published);}})
 .catch(reason=>{if(alive)setError(toMessage(reason))}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[]);
 const localPreview=useMemo(()=>file?URL.createObjectURL(file):"",[file]);
 useEffect(()=>()=>{if(localPreview)URL.revokeObjectURL(localPreview)},[localPreview]);
 const currentSource=localPreview||(sourceMode==="url"?videoUrl:(promo?.storage_path?promoPublicUrl(promo.storage_path):""));
 const embed=currentSource?promoEmbedUrl(currentSource):null;
 async function save(){
  if(!user)return;
  if(sourceMode==="url"&&videoUrl.trim()){try{const url=new URL(videoUrl.trim());if(url.protocol!=="https:")throw new Error("Video bağlantısı HTTPS olmalı.");}catch(reason){toast(reason instanceof Error?reason.message:"Geçerli bir video bağlantısı gir.","error");return;}}
  if(sourceMode==="upload"&&file){if(!ALLOWED_TYPES.includes(file.type)){toast("MP4, WebM veya MOV video seç.","error");return;}if(file.size>MAX_VIDEO_BYTES){toast("Video en fazla 40 MB olabilir.","error");return;}}
  const hasSource=sourceMode==="url"?Boolean(videoUrl.trim()):Boolean(file||(promo?.storage_path&&!promo.video_url));
  if(published&&!hasSource){toast("Yayınlamak için önce video yükle veya bağlantı ekle.","error");return;}
  setSaving(true);let newPath:string|null=null;
  try{
   if(sourceMode==="upload"&&file){const extension=file.name.split(".").pop()?.toLowerCase()||"mp4";newPath=`main/${crypto.randomUUID()}.${extension}`;
    const {error:uploadError}=await requireSupabase().storage.from("zuno-promo-videos").upload(newPath,file,{contentType:file.type,cacheControl:"3600",upsert:false});if(uploadError)throw uploadError;}
   const nextPath=sourceMode==="url"?null:(newPath??promo?.storage_path??null);
   const nextUrl=sourceMode==="url"?(videoUrl.trim()||null):null;
   const {data,error:saveError}=await requireSupabase().from("zuno_site_promo").upsert({id:"main",title:title.trim().slice(0,90)||"ZUNO Icon Store",description:description.trim().slice(0,500),video_url:nextUrl,storage_path:nextPath,is_published:published,updated_by:user.id,updated_at:new Date().toISOString()}).select("id,title,description,video_url,storage_path,is_published,updated_at").single();
   if(saveError)throw saveError;const saved=data as PromoSettings;
   if(promo?.storage_path&&promo.storage_path!==saved.storage_path){const {error:removeError}=await requireSupabase().storage.from("zuno-promo-videos").remove([promo.storage_path]);if(removeError)toast("Yeni video kaydedildi ancak eski dosya temizlenemedi.","error");}
   setPromo(saved);setFile(null);setVideoUrl(saved.video_url??"");setSourceMode(saved.video_url?"url":"upload");toast(saved.is_published?"Tanıtım videosu yayınlandı.":"Tanıtım ayarları kaydedildi.");
  }catch(reason){if(newPath)await requireSupabase().storage.from("zuno-promo-videos").remove([newPath]).catch(()=>undefined);toast(toMessage(reason),"error");}
  finally{setSaving(false);}
 }
 async function remove(){
  if(!window.confirm("Tanıtım videosunu ve depolanan dosyasını kaldırmak istiyor musun?"))return;setSaving(true);
  try{const {error:deleteError}=await requireSupabase().from("zuno_site_promo").delete().eq("id","main");if(deleteError)throw deleteError;
   if(promo?.storage_path){const {error:storageError}=await requireSupabase().storage.from("zuno-promo-videos").remove([promo.storage_path]);if(storageError)throw storageError;}
   setPromo(null);setTitle("ZUNO Icon Store");setDescription("");setVideoUrl("");setFile(null);setPublished(false);setSourceMode("upload");toast("Tanıtım videosu kaldırıldı.");
  }catch(reason){toast(toMessage(reason),"error");}finally{setSaving(false);}
 }
 if(loading)return <section className="admin-promo glass"><p className="muted">Tanıtım ayarları yükleniyor…</p></section>;
 return <section className="admin-promo glass">
  <div className="admin-promo__heading"><div><p className="eyebrow">ANA SAYFA İÇERİĞİ</p><h2>Tanıtım videosu</h2><p className="muted">Videoyu buradan yükle, değiştir ve ziyaretçilere yayınla.</p></div><span className={promo?.is_published?"admin-promo__status is-live":"admin-promo__status"}>{promo?.is_published?"YAYINDA":"TASLAK"}</span></div>
  {error&&<p className="form__error">{error}</p>}
  <div className="form admin-promo__form">
   <label>Video başlığı<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={90} placeholder="ZUNO Icon Store"/></label>
   <label>Kısa açıklama<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} maxLength={500} placeholder="ZUNO dünyasını kısaca tanıt…"/></label>
   <div className="admin-promo__source-tabs" role="group" aria-label="Video kaynağı"><button type="button" className={sourceMode==="upload"?"is-active":""} onClick={()=>setSourceMode("upload")}>Dosya yükle</button><button type="button" className={sourceMode==="url"?"is-active":""} onClick={()=>setSourceMode("url")}>Video bağlantısı</button></div>
   {sourceMode==="upload"?<label className="admin-promo__file">MP4, WebM veya MOV · En fazla 40 MB<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e=>setFile(e.target.files?.[0]??null)}/>{file&&<small>Seçildi: {file.name} · {(file.size/1024/1024).toFixed(1)} MB</small>}{!file&&promo?.storage_path&&<small>Mevcut yüklenmiş video korunacak.</small>}</label>
   :<label>Video URL'si<input type="url" value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="https://youtu.be/... veya doğrudan MP4 bağlantısı"/></label>}
   {currentSource&&<div className="admin-promo__preview"><p className="muted">Önizleme</p><div className="promo-showcase__frame">{embed?<iframe src={embed} title="Tanıtım videosu önizlemesi" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen/>:<video src={currentSource} controls playsInline preload="metadata"/>}</div></div>}
   <label className="admin-promo__publish"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/><span><strong>Ana sayfada yayınla</strong><small>Kapalıysa video ziyaretçilere gösterilmez.</small></span></label>
   <div className="row"><button className="btn btn--primary" type="button" disabled={saving} onClick={()=>void save()}>{saving?"Kaydediliyor…":published?"Kaydet ve yayınla":"Taslak olarak kaydet"}</button>{promo&&<button className="btn btn--danger" type="button" disabled={saving} onClick={()=>void remove()}>Videoyu kaldır</button>}</div>
   <small className="admin-note">Video dosyaları herkese açık medya alanında saklanır. Yalnızca yönetici yükleyebilir veya silebilir.</small>
  </div>
 </section>;
}