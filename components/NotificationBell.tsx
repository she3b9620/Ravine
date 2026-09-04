"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Locale = "ar" | "en";

export default function NotificationBell({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!mounted || !auth.user) return;
      const { count: unread } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id)
        .eq("is_read", false);
      if (mounted) setCount(unread || 0);

      channel = supabase
        .channel(`ravine-notifications:${auth.user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${auth.user.id}` }, () => {
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

  return (
    <Link
      href={`/${locale}/notifications`}
      className="ravine-header-icon ravine-notification-bell"
      aria-label={ar ? "الإشعارات" : "Notifications"}
      title={ar ? "الإشعارات" : "Notifications"}
    >
      <Bell size={18} strokeWidth={1.8} />
      {count > 0 ? <span className="ravine-header-icon-badge">{count > 99 ? "99+" : count}</span> : null}
    </Link>
  );
}
