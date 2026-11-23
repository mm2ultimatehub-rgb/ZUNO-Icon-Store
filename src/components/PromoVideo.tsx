import { useEffect, useState } from "react";
import { fetchPublishedPromo, promoEmbedUrl, promoPublicUrl, type PromoSettings } from "../lib/promo";
export default function PromoVideo(){
 const [promo,setPromo]=useState<PromoSettings|null>(null);
 useEffect(()=>{let alive=true;fetchPublishedPromo().then(value=>{if(alive)setPromo(value)}).catch(()=>undefined);return()=>{alive=false}},[]);
 if(!promo||(!promo.video_url&&!promo.storage_path))return null;
 const source=promo.video_url||(promo.storage_path?promoPublicUrl(promo.storage_path):"");if(!source)return null;
 const embed=promoEmbedUrl(source);
 return <section className="promo-showcase" aria-labelledby="promo-title">
  <div className="promo-showcase__heading"><div><p className="eyebrow">ZUNO'YU KEŞFET</p><h2 id="promo-title">{promo.title}</h2></div><span className="promo-showcase__live"><i/> TANITIM</span></div>
  <div className="promo-showcase__frame">{embed?<iframe src={embed} title={promo.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/>:<video src={source} controls playsInline preload="metadata"/>}</div>
  {promo.description&&<p className="promo-showcase__description">{promo.description}</p>}
 </section>;
}