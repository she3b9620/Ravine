"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
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
    async function load() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/${locale}/auth?next=/${locale}/notifications`;
        return;
      }

      const { data, error: loadError } = await supabase
        .from("notifications")
        .select(
          "id,title,body,notification_type,is_read,created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (loadError) {
        setError(loadError.message);
      } else {
        setItems(data ?? []);
      }

      setLoading(false);
    }

    load();
  }, [locale, supabase]);

  async function markRead(id: string) {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, is_read: true }
          : item
      )
    );
  }

  async function markAllRead() {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setItems((current) =>
      current.map((item) => ({
        ...item,
        is_read: true
      }))
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-4xl text-center">
          {isArabic ? "جارٍ تحميل الإشعارات..." : "Loading notifications..."}
        </div>
      </main>
    );
  }

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#090909] px-5 py-12 text-[#F1E9DC]">
      <div className="mx-auto max-w-4xl">

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#C47A52]">
              RAVINE
            </div>

            <h1 className="mt-3 text-4xl font-black">
              {isArabic ? "الإشعارات" : "Notifications"}
            </h1>
          </div>

          <button
            type="button"
            onClick={markAllRead}
            className="rounded-2xl border border-[#F1E9DC]/10 px-4 py-2 text-sm text-[#F1E9DC]/70"
          >
            {isArabic ? "تحديد الكل كمقروء" : "Mark all as read"}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-8 text-sm text-[#F1E9DC]/50">
              {isArabic ? "لا توجد إشعارات حتى الآن." : "No notifications yet."}
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => markRead(item.id)}
                className="block w-full rounded-3xl border p-5 text-start"
                style={{
                  backgroundColor: item.is_read
                    ? "#151719"
                    : "rgba(196,122,82,.08)",
                  borderColor: item.is_read
                    ? "rgba(241,233,220,.08)"
                    : "rgba(196,122,82,.28)"
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold">
                      {item.title}
                    </h2>

                    {item.body && (
                      <p className="mt-2 text-sm leading-6 text-[#F1E9DC]/60">
                        {item.body}
                      </p>
                    )}

                    <div className="mt-2 text-xs uppercase tracking-wider text-[#F1E9DC]/30">
                      {item.notification_type}
                    </div>
                  </div>

                  {!item.is_read && (
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#C47A52]" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <a
          href={`/${locale}`}
          className="mt-8 inline-block text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
        >
          {isArabic ? "← العودة إلى RAVINE" : "← Back to RAVINE"}
        </a>

      </div>
    </main>
  );
}