"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Check, ChevronDown, Plus, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export const RAVINE_ACTIVE_IDENTITY_KEY = "ravine-active-creator-id";
export const RAVINE_ACTIVE_IDENTITY_COOKIE = "ravine-active-creator-id";

type Locale = "ar" | "en";
type Creator = { id: number; name: string | null; username: string | null; avatar_url: string | null; user_id: string | null };

type Props = { locale: Locale; onNavigate?: () => void };

function persistIdentity(id: number | null) {
  if (typeof window === "undefined") return;
  if (id === null) {
    window.localStorage.removeItem(RAVINE_ACTIVE_IDENTITY_KEY);
    document.cookie = `${RAVINE_ACTIVE_IDENTITY_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  } else {
    window.localStorage.setItem(RAVINE_ACTIVE_IDENTITY_KEY, String(id));
    document.cookie = `${RAVINE_ACTIVE_IDENTITY_COOKIE}=${encodeURIComponent(String(id))}; Max-Age=2592000; Path=/; SameSite=Lax`;
  }
  window.dispatchEvent(new CustomEvent("ravine-identity-change", { detail: { creatorId: id } }));
}

export default function CreatorIdentitySwitcher({ locale, onNavigate }: Props) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    const saved = typeof window !== "undefined'" ? Number(window.localStorage.getItem(RAVINE_ACTIVE_IDENTITY_KEY)) : NaN;
    setActiveId(Number.isInteger(saved) && saved > 0 ? saved : null);
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted || !data.user) return;
      const { data: rows } = await supabase.from("creators").select("id,name,username,avatar_url,user_id").eq("user_id", data.user.id).order("created_at", { ascending: true });
      if (!mounted) return;
      const list = (rows ?? []) as Creator[];
      setCreators(list);
      const validSaved = Number.isInteger(saved) && saved > 0 && list.some((item) => item.id === saved) ? saved : list[0]?.id ?? null;
      if (validSaved !== null && validSaved !== saved) persistIdentity(validSaved);
      setActiveId(validSaved);
      setLoading(false);
    }).catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [supabase]);

  function selectPersonal() {
    setActiveId(null);
    persistIdentity(null);
    setOpen(false);
    onNavigate?.();
    window.location.assign(`/${locale}/account`);
  }

  function selectCreator(creator: Creator) {
    setActiveId(creator.id);
    persistIdentity(creator.id);
    setOpen(false);
    onNavigate?.();
    window.location.assign(`/${locale}/creators/${creator.id}`);
  }

  if (loading && !creators.length) return null;
  if (!creators.length) return null;

  const activeCreator = creators.find((creator) => creator.id === activeId) ?? null;
  const currentLabel = activeCreator ? activeCreator.name || activeCreator.username || (ar ? "هوية مبدع" : "Creator identity") : (ar ? "الحساب الشخصي" : "Personal account");

  return (
    <div className={`ravine-identity-switcher${open ? " is-open" : ""}`} dir={ar ? "rtl" : "ltr"}>
      <button type="button" className="ravine-identity-switcher-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu">
        <span className="ravine-identity-switcher-icon">{activeCreator ? <BriefcaseBusiness size={16} /> : <UserRound size={16} />}</span>
        <span className="ravine-identity-switcher-copy"><small>{ar ? "تتفاعل بصفة" : "Acting as"}</small><strong>{currentLabel}</strong></span>
        <ChevronDown size={14} className="ravine-identity-switcher-chevron" />
      </button>
      {open ? (
        <div className="ravine-identity-switcher-menu" role="menu">
          <button type="button" role="menuitem" className={`ravine-identity-switcher-item${activeId === null ? " is-active" : ""}`} onClick={selectPersonal}>
            <span className="ravine-identity-avatar"><UserRound size={15} /></span>
            <span><strong>{ar ? "الحساب الشخصي" : "Personal account"}</strong><small>{ar ? "تفاعل كمستخدم عادي" : "Interact as yourself"}</small></span>
            {activeId === null ? <Check size={15} /> : null}
          </button>
          <div className="ravine-identity-switcher-divider" />
          <div className="ravine-identity-switcher-label">{ar ? "هوياتك الإبداعية" : "Your creator identities"}</div>
          {creators.map((creator) => {
            const label = creator.name || creator.username || (ar ? "هوية مبدع" : "Creator identity");
            return (
              <button type="button" role="menuitem" className={`ravine-identity-switcher-item${activeId === creator.id ? " is-active" : ""}`} key={creator.id} onClick={() => selectCreator(creator)}>
                <span className="ravine-identity-avatar">{creator.avatar_url ? <img src={creator.avatar_url} alt="" /> : <BriefcaseBusiness size={15} />}</span>
                <span><strong>{label}</strong><small>{creator.username ? `@${creator.username}` : `Creator #${creator.id}`}</small></span>
                {activeId === creator.id ? <Check size={15} /> : null}
              </button>
            );
          })}
          <Link href={`/${locale}/creator/apply`} className="ravine-identity-switcher-create" onClick={() => { setOpen(false); onNavigate?.(); }}>
            <Plus size={15} />
            <span>{ar ? "إنشاء هوية مبدع أخرى" : "Create another creator identity"}</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
