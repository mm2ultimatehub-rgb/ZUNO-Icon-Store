import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { requireSupabase } from "./supabase";

export type SiteConfig = {
  brand: { siteName:string; subtitle:string; logoUrl:string };
  announcement: { enabled:boolean; text:string; linkLabel:string; linkUrl:string };
  navigation: { showDownload:boolean; showAbout:boolean; showUpload:boolean; discoverLabel:string; downloadLabel:string; aboutLabel:string; uploadLabel:string };
  home: { showHero:boolean; showGallery:boolean; showPromoVideo:boolean; eyebrow:string; title:string; highlight:string; description:string; primaryLabel:string; primaryHref:string; secondaryLabel:string; secondaryHref:string };
  download: { eyebrow:string; title:string; highlight:string; description:string; apkUrl:string; features:{title:string;description:string}[] };
  about: { eyebrow:string; title:string; highlight:string; description:string; appTitle:string; appDescription:string; communityTitle:string; communityDescription:string; valuesTitle:string; valueOneTitle:string; valueOneDescription:string; valueTwoTitle:string; valueTwoDescription:string; valueThreeTitle:string; valueThreeDescription:string };
  appearance: { primary:string; cyan:string; pink:string };
  footer: { text:string; githubUrl:string };
};

export const DEFAULT_SITE_CONFIG:SiteConfig = {
  brand:{siteName:"ZUNO",subtitle:"Icon Store",logoUrl:"./zuno-logo.svg?v=2"},
  announcement:{enabled:false,text:"",linkLabel:"",linkUrl:""},
  navigation:{showDownload:true,showAbout:true,showUpload:true,discoverLabel:"Keşfet",downloadLabel:"Uygulama",aboutLabel:"Hakkımızda",uploadLabel:"Yükle"},
  home:{showHero:true,showGallery:true,showPromoVideo:true,eyebrow:"ZUNO TOPLULUĞU",title:"Ana ekranına yeni bir",highlight:"görünüm",description:"Topluluğun tasarladığı ZUNO ikonlarını keşfet, beğendiklerini indir ve kendi tasarımını paylaş.",primaryLabel:"İkon yükle",primaryHref:"/upload",secondaryLabel:"ZUNO APK’yı indir",secondaryHref:"/download"},
  download:{eyebrow:"ZUNO ANDROID UYGULAMASI",title:"Müziğin,",highlight:"kendi ritminde.",description:"ZUNO’yu Android cihazına yükle. Müziğini keşfet, kendi arşivini dinle ve oynatıcını tarzına göre düzenle.",apkUrl:"",features:[
    {title:"Kendi müzik alanın",description:"Çevrimiçi müzik keşfi ve cihazındaki yerel müzik arşivi tek bir oynatıcı deneyiminde."},
    {title:"Tarzını yansıt",description:"Temalar, oynatıcı görünümü, hareketler ve kişiselleştirme seçenekleri."},
    {title:"Dinlemeye devam et",description:"Arka plan oynatma, Android medya kontrolleri ve desteklenen parçalarda senkronize şarkı sözleri."}
  ]},
  about:{eyebrow:"BİZ KİMİZ?",title:"Dinleme deneyimini",highlight:"özgürleştiriyoruz.",description:"ZUNO; müzik deneyimini kişiselleştirmeye, topluluğun yaratıcılığını görünür kılmaya ve uygulama görünümünü sana ait hissettirmeye odaklanan bağımsız bir projedir.",appTitle:"ZUNO Player",appDescription:"Android için geliştirilen ZUNO; çevrimiçi müzik keşfi, yerel müzik arşivi, arka plan oynatma, şarkı sözleri ve kişiselleştirilebilir oynatıcı deneyimini bir araya getirir.",communityTitle:"ZUNO Icon Store",communityDescription:"İkonlarını keşfet, beğendiklerini kaydet ve kendi tasarımlarını toplulukla paylaş. Mağazanın amacı, ZUNO deneyimini herkesin kendi tarzına göre şekillendirebilmesi.",valuesTitle:"Sade, işlevsel ve topluluk odaklı.",valueOneTitle:"Özenli tasarım",valueOneDescription:"Görsel kalite kadar rahat kullanım ve erişilebilirlik de önemli.",valueTwoTitle:"Üreten topluluk",valueTwoDescription:"Herkesin kendi ikon çalışmalarını paylaşabildiği bir alan oluşturuyoruz.",valueThreeTitle:"Sürekli gelişim",valueThreeDescription:"Geri bildirimleri dikkate alarak uygulamayı ve mağazayı adım adım geliştiriyoruz."},
  appearance:{primary:"#8b6cff",cyan:"#38d6ff",pink:"#ff6bb5"},
  footer:{text:"ZUNO · Müzik ve ikon topluluğu",githubUrl:"https://github.com/mm2ultimatehub-rgb/ZUNO-Icon-Store/issues"}
};

function normalizeConfig(raw:unknown):SiteConfig {
  if(!raw||typeof raw!=="object") return DEFAULT_SITE_CONFIG;
  const value=raw as Partial<SiteConfig>;
  const merge=<K extends keyof SiteConfig>(key:K):SiteConfig[K]=>({...DEFAULT_SITE_CONFIG[key],...(value[key]&&typeof value[key]==="object"?value[key]:{})}) as SiteConfig[K];
  const download={...merge("download")};
  const incomingFeatures=Array.isArray(value.download?.features)?value.download.features:[];
  download.features=DEFAULT_SITE_CONFIG.download.features.map((fallback,index)=>{
    const candidate=incomingFeatures[index];
    return candidate&&typeof candidate==="object"?{title:typeof candidate.title==="string"?candidate.title:fallback.title,description:typeof candidate.description==="string"?candidate.description:fallback.description}:fallback;
  });
  return {...DEFAULT_SITE_CONFIG,...value,brand:merge("brand"),announcement:merge("announcement"),navigation:merge("navigation"),home:merge("home"),download,about:merge("about"),appearance:merge("appearance"),footer:merge("footer")};
}

type SiteConfigContextValue={config:SiteConfig;setConfig:(config:SiteConfig)=>void;loading:boolean};
const SiteConfigContext=createContext<SiteConfigContextValue>({config:DEFAULT_SITE_CONFIG,setConfig:()=>undefined,loading:true});
export function SiteConfigProvider({children}:{children:ReactNode}){
 const [config,setConfigState]=useState<SiteConfig>(DEFAULT_SITE_CONFIG);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;
  Promise.resolve(requireSupabase().from("zuno_site_config").select("config").eq("id","main").maybeSingle())
   .then(({data,error})=>{if(error)throw error;if(alive&&data?.config)setConfigState(normalizeConfig(data.config));})
   .catch(()=>undefined).finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[]);
 const setConfig=(next:SiteConfig)=>setConfigState(normalizeConfig(next));
 return <SiteConfigContext.Provider value={{config,setConfig,loading}}>{children}</SiteConfigContext.Provider>;
}
export function useSiteConfig(){return useContext(SiteConfigContext);}
