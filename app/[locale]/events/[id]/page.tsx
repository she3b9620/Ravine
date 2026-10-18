import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarClock, Clock3, PlayCircle, Radio, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import styles from "./event-detail.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type LiveEvent = {
  id: number; creator_id: number; title: string; description: string | null;
  live_type: string; mode: string; status: "scheduled" | "live" | "ended";
  scheduled_at: string | null; started_at: string | null; ended_at: string | null;
  recording_video_id: number | null; created_at: string;
};
type Creator = { id: number; name: string | null; username: string | null; avatar_url: string | null; specialty: string | null };
type Recording = { id: number; title: string | null; description: string | null; thumbnail_url: string | null; duration: number | null; views: number | null; likes: number | null };

function formatDate(value: string | null, locale: Locale, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "full", timeStyle: "short" }).format(date);
}
function typeLabel(type: string, locale: Locale) {
  const labels: Record<string, [string, string]> = {
    solo:["جلسة فردية","Solo session"], co_live:["بث مشترك","Co-live"], guest:["جلسة ضيف","Guest session"],
    panel:["حلقة نقاش","Panel"], podcast:["بودكاست","Podcast"], gaming:["ألعاب","Gaming"],
    watch_party:["مشاهدة جماعية","Watch party"], workshop:["ورشة عمل","Workshop"], premiere:["عرض أول","Premiere"],
  };
  const pair=labels[type]||[type,type];
  return locale==="ar"?pair[0]:pair[1];
}
function modeLabel(mode: string, locale: Locale) {
  if(locale==="ar")return mode==="audio"?"صوت فقط":mode==="hybrid"?"صوت وفيديو":"فيديو";
  return mode==="audio"?"Audio":mode==="hybrid"?"Audio + video":"Video";
}

export default async function EventDetailPage({params}:{params:Promise<{locale:string;id:string}>}) {
  const {locale:rawLocale,id:rawId}=await params;
  const locale:Locale=rawLocale==="en"?"en":"ar";
  const ar=locale==="ar";
  const eventId=Number(rawId);
  if(!Number.isSafeInteger(eventId)||eventId<1)notFound();
  const supabase=await createClient();
  const {data:eventData,error:eventError}=await supabase.from("live_events")
    .select("id,creator_id,title,description,live_type,mode,status,scheduled_at,started_at,ended_at,recording_video_id,created_at")
    .eq("id",eventId).in("status",["scheduled","live","ended"]).maybeSingle();
  if(eventError||!eventData)notFound();
  const event=eventData as LiveEvent;

  const [{data:creatorData},{data:recordingData}]=await Promise.all([
    supabase.from("creators").select("id,name,username,avatar_url,specialty").eq("id",event.creator_id).maybeSingle(),
    event.recording_video_id
      ? supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes")
          .eq("id",event.recording_video_id).eq("published",true).eq("visibility","public").maybeSingle()
      : Promise.resolve({data:null}),
  ]);
  const creator=creatorData as Creator|null;
  const recording=recordingData as Recording|null;
  const creatorName=creator?.name||creator?.username||(ar?"مبدع رَافِين":"RAVINE creator");
  const eventStatus=event.status==="live"?(ar?"جارٍ الآن":"Live now"):event.status==="ended"?(ar?"انتهى الحدث":"Event ended"):(ar?"موعد مجدول":"Scheduled");
  const primaryDate=event.status==="ended"?(event.ended_at||event.started_at||event.scheduled_at):event.status==="live"?(event.started_at||event.scheduled_at):event.scheduled_at;
  const noSchedule=ar?"لم يُحدد الموعد بعد":"Time to be announced";

  return (
    <main className={styles.page} dir={ar?"rtl":"ltr"}>
      <Link href={"/"+locale+"/events"} className={styles.backLink}><ArrowLeft size={16} aria-hidden="true"/>{ar?"العودة إلى الأحداث":"Back to events"}</Link>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true"/>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>RAVINE / EVENT {String(event.id).padStart(4,"0")}</div>
          <div className={styles.statusRow}><span className={styles.status}>{eventStatus}</span><span className={styles.type}>{typeLabel(event.live_type,locale)}</span></div>
          <h1>{event.title}</h1>
          <p>{event.description||(ar?"جلسة من مجتمع رَافِين، مرتبطة بهوية المبدع وأعماله.":"A RAVINE community session connected to the host creator and their work.")}</p>
          <div className={styles.metadata}>
            <span><CalendarClock size={17} aria-hidden="true"/>{formatDate(primaryDate,locale,noSchedule)}</span>
            <span><Clock3 size={17} aria-hidden="true"/>{modeLabel(event.mode,locale)}</span>
            {event.status==="scheduled"?<span><Radio size={17} aria-hidden="true"/>{ar?"جلسة قادمة":"Upcoming session"}</span>:null}
          </div>
        </div>
        <aside className={styles.hostPanel}>
          <div className={styles.hostEyebrow}>{ar?"المضيف":"HOST CREATOR"}</div>
          <div className={styles.hostIdentity}>
            {creator?.avatar_url?<img src={creator.avatar_url} alt=""/>:<span className={styles.avatarFallback}>{creatorName.slice(0,1)}</span>}
            <div><strong>{creatorName}</strong><small>{creator?.specialty||(ar?"هوية إبداعية":"Creative identity")}</small></div>
          </div>
          {creator?<Link className={styles.hostLink} href={"/"+locale+"/creators/"+creator.id}>{ar?"استكشف أعمال المبدع":"Explore creator profile"}<ArrowUpRight size={15}/></Link>:null}
        </aside>
      </section>
      <section className={styles.contentGrid}>
        <article className={styles.contentCard}>
          <div className={styles.cardEyebrow}>{ar?"تفاصيل الجلسة":"SESSION DETAILS"}</div>
          <h2>{ar?"السياق قبل البث.":"Context before the session."}</h2>
          <p>{event.status==="scheduled"
            ?(ar?"هذا موعد مُعلن داخل رَافِين. ستظهر وسيلة المشاركة عند اكتمال إعداد البث من قبل المضيف.":"This session is on the RAVINE schedule. Participation details will appear when the host's streaming setup is complete.")
            :event.status==="live"
              ?(ar?"الحالة تشير إلى أن الجلسة بدأت. إذا لم يظهر تسجيل أو رابط مشاركة، فهذا يعني أن تكامل البث لم يُربط بعد.":"The session is marked as live. If no recording or participation link is available, the streaming integration has not been connected yet.")
              :(ar?"انتهت الجلسة. قد يُنشر تسجيلها لاحقًا كعمل مستقل بعد مراجعته ونشره.":"The session has ended. A recording may be published later as a separate work after review and publication.")}</p>
        </article>
        <article className={styles.contentCard}>
          <div className={styles.cardEyebrow}>{ar?"العودة إلى العمل":"RETURN TO THE WORK"}</div>
          {recording?<>
            <h2>{recording.title||(ar?"تسجيل الجلسة":"Session recording")}</h2>
            <p>{recording.description||(ar?"تسجيل عام منشور ضمن أعمال رَافِين.":"A public recording published as RAVINE work.")}</p>
            <Link className={styles.recordingAction} href={"/"+locale+"/watch/"+recording.id}><PlayCircle size={17} aria-hidden="true"/>{ar?"مشاهدة التسجيل":"Watch recording"}<ArrowUpRight size={15}/></Link>
          </>:<>
            <h2>{ar?"لا يوجد تسجيل عام بعد.":"No public recording yet."}</h2>
            <p>{ar?"لن يظهر رابط تسجيل إلا بعد نشر ملف عام صالح للمشاهدة.":"A recording link appears only after a public, published work is available."}</p>
            <div className={styles.recordingNotice}><Users size={16} aria-hidden="true"/>{ar?"لا يُفترض وجود تسجيل لمجرد وجود موعد.":"A scheduled event does not imply a recording exists."}</div>
          </>}
        </article>
      </section>
    </main>
  );
}
