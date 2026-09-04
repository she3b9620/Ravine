import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

type Notification = {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  is_read: boolean | null;
  created_at: string;
  video_id: number | null;
};

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/notifications`);

  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,title,body,is_read,created_at,video_id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as Notification[];

  return (
    <section className="section notifications-page">
      <div className="eyebrow">RAVINE / NOTIFICATIONS</div>
      <h1>{ar ? "ما يستحق انتباهك." : "What deserves your attention."}</h1>
      <p className="section-note">{ar ? "إشعاراتك المهمة فقط، بدون ضجيج مستمر." : "Important signals only, without a constant stream of noise."}</p>
      {error ? (
        <div className="empty-state"><strong>{ar ? "تعذر تحميل الإشعارات." : "We could not load notifications."}</strong><span>{error.message}</span></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state"><strong>{ar ? "لا توجد إشعارات بعد." : "No notifications yet."}</strong><span>{ar ? "ستظهر التحديثات المهمة هنا." : "Important updates will appear here."}</span></div>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => {
            const content = <div className={`notification-item ${notification.is_read ? "" : "unread"}`}><div className="video-kicker">{notification.type || "RAVINE"}</div><strong>{notification.title || (ar ? "تحديث جديد" : "New update")}</strong><p>{notification.body || ""}</p><span>{new Date(notification.created_at).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</span></div>;
            return notification.video_id ? <Link key={notification.id} href={`/${locale}/watch/${notification.video_id}`}>{content}</Link> : <div key={notification.id}>{content}</div>;
          })}
        </div>
      )}
    </section>
  );
}
