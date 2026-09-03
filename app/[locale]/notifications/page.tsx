"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import PlatformShell from "@/components/PlatformShell";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  notification_type: string;
  is_read: boolean;
  created_at: string | null;
};

export default function NotificationsPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        window.location.href = `/${locale}/auth?next=/${locale}/notifications`;
        return;
      }

      const { data, error: loadError } = await supabase
        .from("notifications")
        .select("id,title,body,notification_type,is_read,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (loadError) setError(loadError.message);
      else setItems(data ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [locale, supabase]);

  async function markRead(id: string) {
    const { error: updateError } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: updateError } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
  }

  return (
    <PlatformShell
      active=""
      eyebrow={isArabic ? "النشاط" : "Activity"}
      title={isArabic ? "خليك عارف إيه اللي بيحصل." : "Stay close to what happens next."}
      description={isArabic ? "كل التحديثات المتعلقة بحسابك والمحتوى اللي تتابعه، في مكان واحد وبدون زحمة." : "Updates around your account and the work you follow, kept focused and out of the way."}
    >
      <div className="mx-auto max-w-[1100px] px-5 pb-16 pt-8 md:px-8 lg:px-10">
        <div className="flex justify-end border-b pb-5" style={{ borderColor: "rgba(241,233,220,.08)" }}>
          <button type="button" onClick={() => void markAllRead()} className="rounded-full border px-4 py-2.5 text-xs font-bold transition" style={{ borderColor: "rgba(241,233,220,.10)", color: "rgba(241,233,220,.68)" }}>
            {isArabic ? "تحديد الكل كمقروء" : "Mark all as read"}
          </button>
        </div>

        {error && <div className="mt-6 border-y py-4 text-sm" style={{ borderColor: "rgba(196,122,82,.24)", color: "rgba(241,233,220,.70)" }}>{isArabic ? "تعذر تحديث الإشعارات حاليًا." : "Notifications could not be updated right now."}</div>}

        {loading ? (
          <div className="mt-8 space-y-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse border-b" style={{ borderColor: "rgba(241,233,220,.07)" }} />)}</div>
        ) : items.length === 0 ? (
          <div className="border-y py-12 text-sm" style={{ borderColor: "rgba(241,233,220,.08)", color: "rgba(241,233,220,.48)" }}>{isArabic ? "لا توجد إشعارات حتى الآن." : "No notifications yet."}</div>
        ) : (
          <div className="mt-4 divide-y" style={{ borderColor: "rgba(241,233,220,.08)" }}>
            {items.map((item) => (
              <button key={item.id} type="button" onClick={() => void markRead(item.id)} className="group flex w-full items-start gap-4 py-5 text-start transition" style={{ opacity: item.is_read ? 0.66 : 1 }}>
                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.is_read ? "rgba(241,233,220,.16)" : "#C47A52" }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{item.title}</span>
                  {item.body && <span className="mt-1 block text-sm leading-6" style={{ color: "rgba(241,233,220,.54)" }}>{item.body}</span>}
                  <span className="mt-2 block text-[10px] uppercase tracking-[.18em]" style={{ color: "rgba(241,233,220,.30)" }}>{item.notification_type}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </PlatformShell>
  );
}
