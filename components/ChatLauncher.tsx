"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";

type Locale = "ar" | "en";

export default function ChatLauncher({ locale }: { locale: Locale }) {
  return (
    <Link
      href={`/${locale}/messages`}
      className="ravine-header-icon ravine-chat-launcher"
      aria-label={locale === "ar" ? "الرسائل" : "Messages"}
      title={locale === "ar" ? "الرسائل" : "Messages"}
    >
      <MessageCircle size={18} strokeWidth={1.8} />
    </Link>
  );
}
