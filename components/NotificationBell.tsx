"use client";

import { Bell, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Locale = "ar" | "en";
type Notification = {
  id: string;
  title: string | null;
  body: string | null;
  is_read: boolean | null;
  created_at: string;
  video_id: number | null;
};

function formatNotificationTime(value: string, locale: Locale) {
  return new Date(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationBell({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!mounted || !auth.user) return;

      const { data, count: unread } = await supabase
        .from("notifications")
        .select("id,title,body,is_read,created_at,video_id", { count: "exact" })
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(6);

      if (!mounted) return;
      const rows = (data ?? []) as Notification[];
      setItems(rows);
      setCount(unread || 0);

      channel = supabase
        .channel(`ravine-notifications:${auth.user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${auth.user.id}` }, (payload) => {
          const notification = payload.new as Notification;
          setItems((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 6));
          setCount((current) => current + 1);
        })
        .subscribe();
    }

    void load();
    return () => {
      mounted = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    setCount((current) => Math.max(0, current - 1));
  }

  async function markAllRead() {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", auth.user.id).eq("is_read", false);
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    setCount(0);
  }

  return (
    <div ref={rootRef} className="ravine-notification-wrap">
      <button
        type="button"
        className="ravine-header-icon ravine-notification-bell"
        aria-label={ar ? "الإشعارات" : "Notifications"}
        title={ar ? "الإشعارات" : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} strokeWidth={1.8} />
        {count > 0 ? <span className="ravine-header-icon-badge">{count > 99 ? "99+" : count}</span> : null}
      </button>

      {open ? (
        <div className="ravine-notification-popover" dir={ar ? "rtl" : "ltr"} role="dialog" aria-label={ar ? "معاينة الإشعارات" : "Notification preview"}>
          <div className="ravine-notification-popover-head">
            <div>
              <span>{ar ? "RAVINE / الإشعارات" : "RAVINE / NOTIFICATIONS"}</span>
              <strong>{ar ? "آخر التحديثات" : "Latest updates"}</strong>
            </div>
            {count > 0 ? (
              <button type="button" className="ravine-notification-mark" onClick={() => void markAllRead()}>
                <Check size={13} />
                {ar ? "قراءة الكل" : "Mark all read"}
              </button>
            ) : null}
          </div>

          <div className="ravine-notification-popover-list">
            {items.length ? items.map((item) => {
              const content = (
                <div className={`ravine-notification-preview-item${item.is_read ? "" : " is-unread"}`}>
                  <span className="ravine-notification-dot" aria-hidden="true" />
                  <div>
                    <strong>{item.title || (ar ? "تحديث جديد" : "New update")}</strong>
                    {item.body ? <p>{item.body}</p> : null}
                    <time>{formatNotificationTime(item.created_at, locale)}</time>
                  </div>
                </div>
              );

              if (item.video_id) {
                return (
                  <Link key={item.id} href={`/${locale}/watch/${item.video_id}`} onClick={() => { void markRead(item.id); setOpen(false); }}>
                    {content}
                  </Link>
                );
              }

              return (
                <button key={item.id} type="button" className="ravine-notification-preview-button" onClick={() => void markRead(item.id)}>
                  {content}
                </button>
              );
            }) : (
              <div className="ravine-notification-empty">{ar ? "لا توجد إشعارات جديدة." : "No notifications yet."}</div>
            )}
          </div>

          <Link className="ravine-notification-open" href={`/${locale}/notifications`} onClick={() => setOpen(false)}>
            <span>{ar ? "فتح صفحة الإشعارات" : "Open notifications"}</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
