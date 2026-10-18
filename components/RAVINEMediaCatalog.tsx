import { Scissors, Clapperboard, Film, Mic2, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RAVINEShortsBrowse from "@/components/RAVINEShortsBrowse";
import RAVINEWorkCatalog, { type RAVINECatalogItem } from "@/components/RAVINEWorkCatalog";

export type RAVINEMediaCatalogType = "short" | "short_film" | "film" | "podcast";
const configs: Record<RAVINEMediaCatalogType, {
  enTitle:string; arTitle:string; enEyebrow:string; arEyebrow:string;
  enDescription:string; arDescription:string; enLabel:string; arLabel:string;
  enEmpty:string; arEmpty:string; icon:LucideIcon; className:string;
}> = {
  short:{enTitle:"Shorts.",arTitle:"الشورتات.",enEyebrow:"RAVINE / SHORTS",arEyebrow:"رَافِين / الشورتات",enDescription:"Short, focused clips with their own discovery experience—separate from regular videos and short films.",arDescription:"مقاطع قصيرة ومكثفة، لها تجربة اكتشاف مستقلة عن الفيديوهات والأفلام القصيرة.",enLabel:"SHORT",arLabel:"شورت",enEmpty:"No published Shorts yet.",arEmpty:"لا توجد شورتات منشورة بعد.",icon:Scissors,className:"ravine-shorts-page"},
  short_film:{enTitle:"Short Films.",arTitle:"الأفلام القصيرة.",enEyebrow:"RAVINE / SHORT FILMS",arEyebrow:"رَافِين / سينما قصيرة",enDescription:"Complete, compact cinematic works—not vertical Shorts or regular video posts.",arDescription:"أفلام سردية مكتملة ومكثفة؛ ليست شورتات عمودية ولا مقاطع فيديو عادية.",enLabel:"SHORT FILM",arLabel:"فيلم قصير",enEmpty:"No published short films yet.",arEmpty:"لا توجد أفلام قصيرة منشورة بعد.",icon:Film,className:"ravine-short-films-page"},
  film:{enTitle:"Feature Films.",arTitle:"الأفلام المطوّلة.",enEyebrow:"RAVINE / FEATURE FILMS",arEyebrow:"رَافِين / سينما طويلة",enDescription:"Completed feature-length cinema, kept separate from short films and documentaries.",arDescription:"أفلام سينمائية طويلة مكتملة، بتصنيف مستقل عن الأفلام القصيرة والوثائقيات.",enLabel:"FEATURE FILM",arLabel:"فيلم مطوّل",enEmpty:"No published feature films yet.",arEmpty:"لا توجد أفلام مطوّلة منشورة بعد.",icon:Clapperboard,className:"ravine-feature-films-page"},
  podcast:{enTitle:"Podcasts.",arTitle:"البودكاست.",enEyebrow:"RAVINE / AUDIO",arEyebrow:"رَافِين / الصوت",enDescription:"Conversations, ideas, and audio programs given the time and space to breathe.",arDescription:"حوارات وأفكار وبرامج صوتية تمنح الفكرة وقتها ومساحتها.",enLabel:"PODCAST",arLabel:"بودكاست",enEmpty:"No podcast episodes published yet.",arEmpty:"لا توجد حلقات بودكاست منشورة بعد.",icon:Mic2,className:"ravine-podcasts-page"},
};
type Work={id:number;title:string|null;description:string|null;thumbnail_url:string|null;video_url:string|null;duration:number|null;views:number|null;likes:number|null;quality:string|null;created_at:string|null};

export default async function RAVINEMediaCatalog({locale,contentType}:{locale:"ar"|"en";contentType:RAVINEMediaCatalogType}) {
  const ar=locale==="ar",config=configs[contentType],Icon=config.icon,supabase=await createClient();
  const {data,error}=await supabase.from("videos")
    .select("id,title,description,thumbnail_url,video_url,duration,views,likes,quality,created_at")
    .eq("published",true).eq("visibility","public").eq("content_type",contentType)
    .order("created_at",{ascending:false}).limit(60);
  const works=(data??[]) as Work[];
  const items:RAVINECatalogItem[]=works.map(work=>({
    id:work.id,href:`/${locale}/watch/${work.id}`,title:work.title||(ar?"بدون عنوان":"Untitled"),
    description:work.description||(ar?(contentType==="podcast"?"برنامج صوتي من مجتمع رَافِين.":"عمل من مجتمع رَافِين."):(contentType==="podcast"?"An audio program from the RAVINE community.":"A work from the RAVINE community.")),
    imageUrl:work.thumbnail_url,duration:work.duration,views:work.views,likes:work.likes,quality:work.quality,createdAt:work.created_at,
    badge:ar?config.arLabel:config.enLabel,kicker:config.enLabel,
    badgeIcon:contentType==="podcast"?"podcast":contentType==="film"?"film":contentType==="short_film"?"short-film":undefined,
    badgeTone:contentType==="podcast"?"podcast":undefined,
    badgeClassName:contentType==="podcast"?"ravine-podcast-pill":undefined,
    cardClassName:contentType==="podcast"?"ravine-podcast-card":undefined,
  }));
  return <section className={`section ravine-documentaries-page ${config.className}`} dir={ar?"rtl":"ltr"}>
    <div className="ravine-documentaries-hero"><div className="ravine-documentaries-mark" aria-hidden="true"><Icon size={28} strokeWidth={1.6}/></div>
      <div><div className="eyebrow">{ar?config.arEyebrow:config.enEyebrow}</div><h1>{ar?config.arTitle:config.enTitle}</h1>
        <p className="section-note">{ar?config.arDescription:config.enDescription}</p>
        {!error&&works.length>0?<div className="ravine-series-count">{formatCountLabel(works.length,locale,contentType)}</div>:null}
      </div>
    </div>
    {error?<div className="empty-state"><strong>{ar?(contentType==="podcast"?"تعذر تحميل البودكاست.":"تعذر تحميل المحتوى."):(contentType==="podcast"?"We could not load podcasts.":"We could not load this content.")}</strong><span>{error.message}</span></div>
      :works.length===0?<div className="empty-state"><strong>{ar?config.arEmpty:config.enEmpty}</strong><span>{ar?"ستظهر الأعمال هنا بعد اعتماد نشرها من مساحة المبدع.":"Published work will appear here after creator publication."}</span></div>
      :contentType==="short"?<RAVINEShortsBrowse locale={locale} works={works}/>
      :<RAVINEWorkCatalog locale={locale} items={items}/>}
  </section>;
}
function formatCountLabel(count:number,locale:"ar"|"en",contentType:RAVINEMediaCatalogType) {
  const ar=locale==="ar";
  if(ar)return `${count.toLocaleString("ar-EG")} ${contentType==="podcast"?"حلقة منشورة":"عمل منشور"}`;
  return `${count.toLocaleString("en-US")} ${contentType==="podcast"?"published episodes":"published works"}`;
}
