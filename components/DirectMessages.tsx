"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ravineErrorMessage } from "@/lib/ravine-error";

type Locale = "ar" | "en";
type Conversation = { id: string; participant_a: string; participant_b: string; requester_id: string; creator_id: number | null; status: string; requester_message_count: number; creator_message_count: number; last_message_at: string | null };
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
type Person = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; is_creator: boolean | null };

function localizedStatus(status: string, ar: boolean) {
  const value = status.toLowerCase();
  if (!ar) return status;
  if (value === "pending") return "في انتظار الرد";
  if (value === "blocked") return "متوقفة";
  if (value === "closed") return "مغلقة";
  if (value === "active") return "نشطة";
  return "حالة المحادثة";
}

export default function DirectMessages({ locale, initialRecipient, initialCreatorId, compact = false }: { locale: Locale; initialRecipient?: string; initialCreatorId?: number; compact?: boolean }) {
  const ar = locale === "ar";
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipientId, setRecipientId] = useState(initialRecipient || "");
  const [creatorId, setCreatorId] = useState<number | undefined>(initialCreatorId);
  const [draft, setDraft] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const selected = conversations.find((item) => item.id === selectedId) || null;
  const selectedOtherId = selected && userId ? (selected.participant_a === userId ? selected.participant_b : selected.participant_a) : null;
  const selectedPerson = selectedOtherId ? people[selectedOtherId] : null;
  const pendingCreatorContact = Boolean(selected?.creator_id && selected.status === "pending" && selected.requester_id === userId && selected.creator_message_count === 0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!mounted || !auth.user) return;
      setUserId(auth.user.id);
      const { data, error: conversationsError } = await supabase.from("direct_conversations").select("id,participant_a,participant_b,requester_id,creator_id,status,requester_message_count,creator_message_count,last_message_at").order("last_message_at", { ascending: false, nullsFirst: false });
      if (!mounted) return;
      if (conversationsError) setError(ravineErrorMessage(conversationsError, locale));
      const rows = (data || []) as Conversation[];
      setConversations(rows);
      const ids = Array.from(new Set(rows.flatMap((row) => [row.participant_a, row.participant_b])));
      if (ids.length) {
        const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id,username,display_name,avatar_url,is_creator").in("id", ids);
        if (profilesError) setError(ravineErrorMessage(profilesError, locale));
        const mapped: Record<string, Person> = {};
        for (const person of (profiles || []) as Person[]) mapped[person.id] = person;
        if (mounted) setPeople(mapped);
      }
      if (mounted && rows.length && !selectedId) setSelectedId(rows[0].id);
    }
    void load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    async function load() {
      const { data, error: messagesError } = await supabase.from("direct_messages").select("id,conversation_id,sender_id,body,created_at").eq("conversation_id", selectedId).order("created_at", { ascending: true });
      if (messagesError && mounted) setError(ravineErrorMessage(messagesError, locale));
      if (mounted) setMessages((data || []) as Message[]);
      channel = supabase.channel(`ravine-dm:${selectedId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        const message = payload.new as Message;
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      }).subscribe();
    }
    void load();
    return () => { mounted = false; if (channel) void supabase.removeChannel(channel); };
  }, [selectedId]);

  useEffect(() => {
    if (!initialRecipient) return;
    const existing = conversations.find((row) => row.participant_a === initialRecipient || row.participant_b === initialRecipient);
    if (existing) setSelectedId(existing.id);
    else setRecipientId(initialRecipient);
  }, [initialRecipient, conversations]);

  const sendBlockedReason = useMemo(() => {
    if (!selected) return "";
    if (selected.creator_id && selected.requester_id === userId && selected.creator_message_count === 0 && selected.requester_message_count >= 3) return ar ? "أرسلت الحد الأقصى (3 رسائل). انتظر رد المبدع." : "You reached the 3-message limit. Wait for the creator to reply.";
    if (selected.status === "blocked") return ar ? "هذه المحادثة متوقفة." : "This conversation is blocked.";
    if (selected.status === "closed") return ar ? "هذه المحادثة مغلقة." : "This conversation is closed.";
    return "";
  }, [selected, userId, ar]);

  async function startOrSend() {
    const body = draft.trim();
    if (!body) return;
    if (!recipientId) { setError(ar ? "اختر مستخدمًا أو افتح صفحة مبدع أولًا." : "Select a user or open a creator profile first."); return; }
    setError("");
    const { data, error: rpcError } = await supabase.rpc("start_direct_conversation", { p_recipient_id: recipientId, p_creator_id: creatorId ?? null, p_body: body });
    if (rpcError || !data) { setError(ravineErrorMessage(rpcError, locale)); return; }
    setDraft("");
    setSelectedId(String(data));
    const { data: rows, error: conversationsError } = await supabase.from("direct_conversations").select("id,participant_a,participant_b,requester_id,creator_id,status,requester_message_count,creator_message_count,last_message_at").order("last_message_at", { ascending: false, nullsFirst: false });
    if (conversationsError) setError(ravineErrorMessage(conversationsError, locale));
    setConversations((rows || []) as Conversation[]);
  }

  async function searchUser(event: React.FormEvent) {
    event.preventDefault();
    const handle = username.trim().replace(/^@/, "");
    if (!handle) return;
    const { data, error: searchError } = await supabase.from("profiles").select("id,username,display_name,avatar_url,is_creator").eq("username", handle).maybeSingle();
    if (searchError) { setError(ravineErrorMessage(searchError, locale)); return; }
    if (!data) { setError(ar ? "لم يتم العثور على المستخدم." : "User not found."); return; }
    const person = data as Person;
    setPeople((current) => ({ ...current, [person.id]: person }));
    setRecipientId(person.id);
    setCreatorId(undefined);
    setError("");
  }

  return (
    <section className={`section direct-messages-page${compact ? " direct-messages-page--compact" : ""}`} dir={ar ? "rtl" : "ltr"}>
      {!compact ? (
        <>
          <div className="eyebrow">RAVINE / {ar ? "الرسائل" : "MESSAGES"}</div>
          <div className="direct-messages-head">
            <div><h1>{ar ? "رسائلك الخاصة." : "Your private messages."}</h1><p>{ar ? "محادثات بين المستخدمين، مع بوابة تواصل تحمي وقت المبدعين." : "User-to-user conversations, with a creator contact gate that protects creator time."}</p></div>
            <MessageCircle size={34} strokeWidth={1.4} />
          </div>
        </>
      ) : null}

      <div className="direct-messages-layout">
        <aside className="direct-inbox">
          <form className="direct-new-user" onSubmit={searchUser}><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder={ar ? "اسم المستخدم @..." : "Username @..."} /><button className="button secondary" type="submit">{ar ? "محادثة" : "Start"}</button></form>
          <div className="direct-conversations">
            {conversations.length ? conversations.map((conversation) => {
              const other = userId ? (conversation.participant_a === userId ? conversation.participant_b : conversation.participant_a) : "";
              const person = people[other];
              return <button key={conversation.id} type="button" className={`direct-conversation ${selectedId === conversation.id ? "active" : ""}`} onClick={() => setSelectedId(conversation.id)}><span className="direct-avatar">{person?.avatar_url ? <img src={person.avatar_url} alt=""/> : (person?.display_name || person?.username || "R").slice(0,1).toUpperCase()}</span><span><strong>{person?.display_name || person?.username || (ar ? "مستخدم" : "User")}</strong><small>{conversation.creator_id && conversation.status === "pending" ? (ar ? "في انتظار رد المبدع" : "Waiting for creator reply") : localizedStatus(conversation.status, ar)}</small></span></button>;
            }) : <div className="direct-empty">{ar ? "ابدأ محادثة من اسم مستخدم أو من صفحة مبدع." : "Start a conversation from a username or a creator profile."}</div>}
          </div>
        </aside>
        <div className="direct-thread">
          {!selected && recipientId ? <div className="direct-empty"><strong>{ar ? "رسالة جديدة" : "New conversation"}</strong><span>{people[recipientId]?.display_name || people[recipientId]?.username || recipientId}</span></div> : null}
          {selected ? <>
            <header className="direct-thread-head"><div><strong>{selectedPerson?.display_name || selectedPerson?.username || (ar ? "مستخدم" : "User")}</strong><span>{selectedPerson?.username ? `@${selectedPerson.username}` : ""}</span></div><button type="button" className="direct-close" onClick={() => setSelectedId(null)} aria-label={ar ? "إغلاق" : "Close"}><X size={16}/></button></header>
            <div className="direct-thread-status">{pendingCreatorContact ? (ar ? `تواصل مع المبدع: ${selected.requester_message_count}/3 رسائل أرسلت. بمجرد أن يرد المبدع تفتح المحادثة بالكامل.` : `Creator contact: ${selected.requester_message_count}/3 messages sent. The conversation opens fully when the creator replies.`) : null}{sendBlockedReason ? <strong>{sendBlockedReason}</strong> : null}</div>
            <div className="direct-thread-messages">{messages.map((message) => <div key={message.id} className={`direct-bubble ${message.sender_id === userId ? "mine" : "theirs"}`}>{message.body}<time>{new Date(message.created_at).toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })}</time></div>)}</div>
          </> : null}
          <div className="direct-compose">
            {(error || (!selected && !recipientId)) ? <div className="direct-error">{error || (ar ? "اختر محادثة أو ابدأ واحدة جديدة." : "Select a conversation or start a new one.")}</div> : null}
            <div className="direct-compose-row"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} disabled={Boolean(sendBlockedReason) || (!selected && !recipientId)} placeholder={ar ? "اكتب رسالتك…" : "Write a message…"} rows={2}/><button type="button" className="button primary" onClick={() => void startOrSend()} disabled={!draft.trim() || Boolean(sendBlockedReason) || (!selected && !recipientId)}><Send size={16}/>{ar ? "إرسال" : "Send"}</button></div>
          </div>
        </div>
      </div>
    </section>
  );
}
