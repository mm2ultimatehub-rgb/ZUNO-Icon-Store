import { requireSupabase } from "./supabase";
export type PromoSettings = { id:"main"; title:string; description:string; video_url:string|null; storage_path:string|null; is_published:boolean; updated_at:string };
export async function fetchPublishedPromo():Promise<PromoSettings|null>{
 const {data,error}=await requireSupabase().from("zuno_site_promo").select("id,title,description,video_url,storage_path,is_published,updated_at").eq("id","main").eq("is_published",true).maybeSingle();
 if(error) throw error; return (data as PromoSettings|null)??null;
}
export function promoPublicUrl(path:string):string{return requireSupabase().storage.from("zuno-promo-videos").getPublicUrl(path).data.publicUrl;}
export function promoEmbedUrl(raw:string):string|null{
 try{const url=new URL(raw);const host=url.hostname.replace(/^www\./,"").toLowerCase();
 if(host==="youtu.be"){const id=url.pathname.split("/").filter(Boolean)[0];return id?`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`:null;}
 if(host==="youtube.com"||host==="m.youtube.com"){const id=url.searchParams.get("v")||url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];return id?`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`:null;}
 if(host==="vimeo.com"||host==="player.vimeo.com"){const id=url.pathname.split("/").filter(Boolean).pop();return id&&/^\d+$/.test(id)?`https://player.vimeo.com/video/${id}`:null;}
 return null;}catch{return null;}
}