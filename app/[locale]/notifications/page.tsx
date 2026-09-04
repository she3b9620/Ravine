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

  const markAllRead = async () => {
    "use server";
    const server = await createClient();
    const { data: session } = await server.auth.getUser();
    if (!session.user) return;
    await server.from("notifications").update({ is_read: true }).eq("user_id", session.user.id).eq("is_read", false);
  };

  const markRead = async (formData: FormData) => {
    "use server";
    const id = String(formData.get("id") || "");
    if (!id) return;
    const server = await createClient();
    const { data: session } = await server.auth.getUser();
    if (!session.user) return;
    await server.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", session.user.id);
  };

  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,title,body,is_read,created_at,video_id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as Notification[];
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <section className="section notifications-page">
      <div className="eyebrow">RAVINE / NOTIFICATIONS</div>
      <div className="section-head">
        <div>
          <h1>{ar ? "ما يستحق انتباهك." : "What deserves your attention."}</h1>
          <p className="section-note">{ar ? "إشعاراتك المهمة فقط، بدون ضجيج مستمر." : "Important signals only, without a constant stream of noise."}</p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllRead}>
            <button className="button secondary" type="submit">{ar ? `تحديد الكل كمقروء (${unreadCount})` : `Mark all read (${unreadCount})`}</button>
          </form>
        ) : null}
      </div>
      {error ? (
        <div className="empty-state"><strong>{ar ? "تعذر تحميل الإشعارات." : "We could not load notifications."}</strong><span>{error.message}</span></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state"><strong>{ar ? "لا توجد إشعارات بعد." : "No notifications yet."}</strong><span>{ar ? "ستظهر التحديثات المهمة هنا." : "Important updates will appear here."}</span></div>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => {
            const content = (
              <div className={`notification-item ${notification.is_read ? "" : "unread"}`}>
                <div className="video-kicker">{notification.type || "RAVINE"}</div>
                <strong>{notification.title || (ar ? "تحديث جديد" : "New update")}</strong>
                <p>{notification.body || ""}</p>
                <span>{new Date(notification.created_at).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</span>
              </div>
            );

            if (notification.video_id) {
              return (
                <form action={markRead} key={notification.id}>
                  <input type="hidden" name="id" value={notification.id} />
                  <Link href={`/${locale}/watch/${notification.video_id}`} onClick={() => undefined}>
                    {content}
                  </Link>
                </form>
              );
            }

            return (
              <form action={markRead} key={notification.id}>
                <input type="hidden" name="id" value={notification.id} />
                <button type="submit" className="notification-action">{content}</button>
              </form>
            );
          })}
        </div>
      )}
    </section>
  );
}
