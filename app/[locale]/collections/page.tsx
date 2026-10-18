import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { BookmarkPlus, Eye, LockKeyhole, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import styles from "./collections.module.css";
import RAVINECollectionsDirectory, { type RAVINECollectionDirectoryItem } from "@/components/RAVINECollectionsDirectory";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type CollectionRow = {
  id: string;
  owner_user_id: string | null;
  owner_creator_id: number | null;
  title: string;
  description: string | null;
  visibility: "private" | "public" | "members" | string;
  created_at: string;
};
type CollectionItemRow = { work_id: number | null; sort_order: number; note: string | null };
type WorkRow = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  content_type: string | null;
  quality: string | null;
  created_at: string | null;
};

const collectionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeLocale(value: FormDataEntryValue | null): Locale {
  return value === "en" ? "en" : "ar";
}

async function resolveManagedCollection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  collectionId: string,
) {
  const { data: collection, error } = await supabase
    .from("ravine_collections")
    .select("id,owner_user_id,owner_creator_id,title,description,visibility,created_at")
    .eq("id", collectionId)
    .maybeSingle();
  if (error || !collection) return null;
  if (collection.owner_user_id === userId) return collection;
  if (!collection.owner_creator_id) return null;

  const { data: creator, error: creatorError } = await supabase
    .from("creators")
    .select("id")
    .eq("id", collection.owner_creator_id)
    .eq("user_id", userId)
    .maybeSingle();
  return creatorError || !creator ? null : collection;
}

export async function createCollectionAction(formData: FormData) {
  "use server";
  const locale = safeLocale(formData.get("locale"));
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  const visibility = formData.get("visibility") === "public" ? "public" : "private";
  if (!title) redirect("/" + locale + "/collections?error=title");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/collections"));

  const { data: created, error } = await supabase
    .from("ravine_collections")
    .insert({ owner_user_id: auth.user.id, owner_creator_id: null, title, description: description || null, visibility })
    .select("id")
    .single();

  if (error || !created) redirect("/" + locale + "/collections?error=create");
  revalidatePath("/" + locale + "/collections");
  redirect("/" + locale + "/collections?id=" + encodeURIComponent(String(created.id)));
}

export async function addCollectionItemAction(formData: FormData) {
  "use server";
  const locale = safeLocale(formData.get("locale"));
  const collectionId = String(formData.get("collection_id") ?? "");
  const workId = Number(formData.get("work_id"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!collectionIdPattern.test(collectionId) || !Number.isSafeInteger(workId) || workId <= 0) {
    redirect("/" + locale + "/collections?error=input");
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/collections?id=" + collectionId));
  const collection = await resolveManagedCollection(supabase, auth.user.id, collectionId);
  if (!collection) redirect("/" + locale + "/collections?error=access");

  const { data: work, error: workError } = await supabase
    .from("videos")
    .select("id")
    .eq("id", workId)
    .eq("published", true)
    .eq("visibility", "public")
    .maybeSingle();
  if (workError || !work) redirect("/" + locale + "/collections?id=" + collectionId + "&error=work");

  const { data: duplicate, error: duplicateError } = await supabase
    .from("ravine_collection_items")
    .select("sort_order")
    .eq("collection_id", collectionId)
    .eq("work_id", workId)
    .limit(1)
    .maybeSingle();
  if (duplicateError) redirect("/" + locale + "/collections?id=" + collectionId + "&error=item");
  if (duplicate) redirect("/" + locale + "/collections?id=" + collectionId + "&notice=duplicate");

  const { data: lastItem, error: lastItemError } = await supabase
    .from("ravine_collection_items")
    .select("sort_order")
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastItemError) redirect("/" + locale + "/collections?id=" + collectionId + "&error=item");

  const { error } = await supabase.from("ravine_collection_items").insert({
    collection_id: collectionId,
    work_id: workId,
    creator_id: null,
    community_id: null,
    note: note || null,
    sort_order: Number(lastItem?.sort_order ?? 0) + 1,
  });
  if (error) redirect("/" + locale + "/collections?id=" + collectionId + "&error=item");

  revalidatePath("/" + locale + "/collections");
  redirect("/" + locale + "/collections?id=" + collectionId + "&notice=added");
}

export async function removeCollectionItemAction(formData: FormData) {
  "use server";
  const locale = safeLocale(formData.get("locale"));
  const collectionId = String(formData.get("collection_id") ?? "");
  const sortOrder = Number(formData.get("sort_order"));
  if (!collectionIdPattern.test(collectionId) || !Number.isSafeInteger(sortOrder) || sortOrder < 0) {
    redirect("/" + locale + "/collections?error=input");
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/collections?id=" + collectionId));
  const collection = await resolveManagedCollection(supabase, auth.user.id, collectionId);
  if (!collection) redirect("/" + locale + "/collections?error=access");

  const { error } = await supabase
    .from("ravine_collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("sort_order", sortOrder);
  if (error) redirect("/" + locale + "/collections?id=" + collectionId + "&error=item");

  revalidatePath("/" + locale + "/collections");
  redirect("/" + locale + "/collections?id=" + collectionId + "&notice=removed");
}

export async function updateCollectionDetailsAction(formData: FormData) {
  "use server";
  const locale = safeLocale(formData.get("locale"));
  const collectionId = String(formData.get("collection_id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  if (!collectionIdPattern.test(collectionId)) redirect("/" + locale + "/collections?error=input");
  if (!title) redirect("/" + locale + "/collections?id=" + encodeURIComponent(collectionId) + "&error=title");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/collections?id=" + collectionId));
  const collection = await resolveManagedCollection(supabase, auth.user.id, collectionId);
  if (!collection) redirect("/" + locale + "/collections?error=access");

  const { data: updated, error } = await supabase
    .from("ravine_collections")
    .update({ title, description: description || null, updated_at: new Date().toISOString() })
    .eq("id", collectionId)
    .select("id")
    .maybeSingle();
  if (error || !updated) redirect("/" + locale + "/collections?id=" + collectionId + "&error=details");

  revalidatePath("/" + locale + "/collections");
  redirect("/" + locale + "/collections?id=" + encodeURIComponent(collectionId) + "&notice=updated");
}

export async function updateCollectionVisibilityAction(formData: FormData) {
  "use server";
  const locale = safeLocale(formData.get("locale"));
  const collectionId = String(formData.get("collection_id") ?? "");
  const visibility = formData.get("visibility") === "public" ? "public" : "private";
  if (!collectionIdPattern.test(collectionId)) redirect("/" + locale + "/collections?error=input");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/collections?id=" + collectionId));
  const collection = await resolveManagedCollection(supabase, auth.user.id, collectionId);
  if (!collection) redirect("/" + locale + "/collections?error=access");

  const { error } = await supabase
    .from("ravine_collections")
    .update({ visibility, updated_at: new Date().toISOString() })
    .eq("id", collectionId);
  if (error) redirect("/" + locale + "/collections?id=" + collectionId + "&error=visibility");

  revalidatePath("/" + locale + "/collections");
  redirect("/" + locale + "/collections?id=" + collectionId);
}

export async function deleteCollectionAction(formData: FormData) {
  "use server";
  const locale = safeLocale(formData.get("locale"));
  const collectionId = String(formData.get("collection_id") ?? "");
  if (!collectionIdPattern.test(collectionId)) redirect("/" + locale + "/collections?error=input");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/collections?id=" + collectionId));
  const collection = await resolveManagedCollection(supabase, auth.user.id, collectionId);
  if (!collection) redirect("/" + locale + "/collections?error=access");

  const { error } = await supabase.from("ravine_collections").delete().eq("id", collectionId);
  if (error) redirect("/" + locale + "/collections?id=" + collectionId + "&error=delete");

  revalidatePath("/" + locale + "/collections");
  redirect("/" + locale + "/collections?notice=deleted");
}

export default async function CollectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; error?: string; notice?: string }>;
}) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const collectionId = typeof query.id === "string" && collectionIdPattern.test(query.id) ? query.id : "";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;

  let pageError = "";
  let notice = "";
  const errorCopy: Record<string, [string, string]> = {
    title: ["أدخل اسمًا للمجموعة.", "Enter a collection title."],
    details: ["تعذر حفظ تفاصيل المجموعة.", "Could not save collection details."],
    create: ["تعذر إنشاء المجموعة. تحقق من إعداد صلاحيات المجموعات ثم حاول مرة أخرى.", "Could not create the collection. Check collection access policies and try again."],
    input: ["البيانات المرسلة غير صالحة.", "The submitted data is invalid."],
    access: ["لا تملك صلاحية إدارة هذه المجموعة.", "You do not have permission to manage this collection."],
    work: ["العمل غير متاح؛ يمكن إضافة الأعمال المنشورة للعامة فقط.", "That work is unavailable; only published public work can be added."],
    item: ["تعذر تحديث عناصر المجموعة.", "Could not update collection items."],
    visibility: ["تعذر تحديث خصوصية المجموعة.", "Could not update collection visibility."],
    delete: ["تعذر حذف المجموعة.", "Could not delete the collection."],
  };
  const noticeCopy: Record<string, [string, string]> = {
    duplicate: ["هذا العمل موجود بالفعل في المجموعة.", "This work is already in the collection."],
    added: ["تمت إضافة العمل إلى المجموعة.", "Work added to the collection."],
    removed: ["تمت إزالة العمل من المجموعة.", "Work removed from the collection."],
    deleted: ["تم حذف المجموعة.", "Collection deleted."],
    updated: ["تم حفظ تفاصيل المجموعة.", "Collection details saved."],
  };
  pageError = query.error && errorCopy[query.error] ? errorCopy[query.error][ar ? 0 : 1] : "";
  if (query.notice && noticeCopy[query.notice]) notice = noticeCopy[query.notice][ar ? 0 : 1];

  if (collectionId) {
    const { data: collection, error: collectionError } = await supabase
      .from("ravine_collections")
      .select("id,owner_user_id,owner_creator_id,title,description,visibility,created_at")
      .eq("id", collectionId)
      .maybeSingle();

    if (collectionError) {
      return (
        <section className={"section " + styles.page} dir={ar ? "rtl" : "ltr"}>
          <div className="eyebrow">RAVINE / {ar ? "المجموعات" : "COLLECTIONS"}</div>
          <div className={styles.notice} role="alert">
            <strong>{ar ? "تعذر تحميل المجموعات." : "Collections are unavailable."}</strong>
            <span>{ar ? "قد تحتاج صلاحيات قاعدة البيانات إلى التحديث أولًا." : "Collection database policies may need to be installed first."}</span>
          </div>
        </section>
      );
    }
    if (!collection) notFound();

    const collectionRow = collection as CollectionRow;
    let canManage = Boolean(userId && collectionRow.owner_user_id === userId);
    if (!canManage && userId && collectionRow.owner_creator_id) {
      const { data: ownedIdentity } = await supabase
        .from("creators")
        .select("id")
        .eq("id", collectionRow.owner_creator_id)
        .eq("user_id", userId)
        .maybeSingle();
      canManage = Boolean(ownedIdentity);
    }

    const { data: itemRows, error: itemsError } = await supabase
      .from("ravine_collection_items")
      .select("work_id,sort_order,note")
      .eq("collection_id", collectionId)
      .order("sort_order", { ascending: true });
    const collectionItems = (itemRows ?? []) as CollectionItemRow[];
    const workIds = Array.from(new Set(collectionItems.map((item) => Number(item.work_id)).filter((id) => Number.isSafeInteger(id) && id > 0)));
    const [{ data: workRows }, { data: workOptions }] = await Promise.all([
      workIds.length
        ? supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,created_at").in("id", workIds).eq("published", true).eq("visibility", "public")
        : Promise.resolve({ data: [] }),
      canManage
        ? supabase.from("videos").select("id,title,content_type").eq("published", true).eq("visibility", "public").order("created_at", { ascending: false }).limit(100)
        : Promise.resolve({ data: [] }),
    ]);

    const worksById = new Map<number, WorkRow>((workRows ?? []).map((work) => [Number(work.id), work as WorkRow]));
    const orderedItems = collectionItems.flatMap((item) => {
      const work = worksById.get(Number(item.work_id));
      return work ? [{ item, work }] : [];
    });

    return (
      <section className={"section " + styles.page} dir={ar ? "rtl" : "ltr"}>
        <div className={styles.topRow}>
          <Link href={"/" + locale + "/collections"} className={styles.backLink}>{ar ? "كل المجموعات" : "All collections"}</Link>
          <span className={styles.visibilityPill}>{collectionRow.visibility === "public" ? <Eye size={13} aria-hidden="true" /> : <LockKeyhole size={13} aria-hidden="true" />}{collectionRow.visibility === "public" ? (ar ? "عامة" : "Public") : collectionRow.visibility === "members" ? (ar ? "الأعضاء فقط" : "Members only") : (ar ? "خاصة" : "Private")}</span>
        </div>
        <div className={styles.collectionHero}>
          <div className="eyebrow">RAVINE / COLLECTION</div>
          <h1>{collectionRow.title}</h1>
          <p>{collectionRow.description || (ar ? "مجموعة منتقاة حول أعمال تستحق الاحتفاظ بها والعودة إليها." : "A curated collection of work worth keeping and returning to.")}</p>
          {collectionRow.visibility === "members" ? <span className={styles.helperNote}>{ar ? "وصول الأعضاء ما زال غير مفعّل؛ هذه المجموعة لا تظهر إلا لمالكها حتى تكتمل سياسات العضوية." : "Member access is not enabled yet; only the owner can see this collection until membership policies are completed."}</span> : null}
        </div>
        {pageError ? <div className={styles.error} role="alert">{pageError}</div> : null}
        {notice ? <p className={styles.noticeText} role="status">{notice}</p> : null}

        {canManage ? (
          <div className={styles.manager}>
            <form action={updateCollectionDetailsAction} className={styles.detailsForm}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="collection_id" value={collectionId} />
              <div className={styles.detailsFormHeading}>
                <strong>{ar ? "تفاصيل المجموعة" : "Collection details"}</strong>
                <span>{ar ? "يمكنك تحديث العنوان والوصف دون تغيير الأعمال الموجودة." : "Update the title and description without changing the works already inside."}</span>
              </div>
              <div className={styles.detailsFields}>
                <label>
                  <span>{ar ? "عنوان المجموعة" : "Collection title"}</span>
                  <input name="title" required maxLength={120} defaultValue={collectionRow.title} />
                </label>
                <label>
                  <span>{ar ? "الوصف" : "Description"}</span>
                  <input name="description" maxLength={1000} defaultValue={collectionRow.description || ""} placeholder={ar ? "ما الفكرة التي تجمع هذه الأعمال؟" : "What brings these works together?"} />
                </label>
              </div>
              <button className="button secondary" type="submit">{ar ? "حفظ التفاصيل" : "Save details"}</button>
            </form>
            <form action={addCollectionItemAction} className={styles.addForm}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="collection_id" value={collectionId} />
              <label>
                <span>{ar ? "أضف عملًا عامًا" : "Add public work"}</span>
                <select name="work_id" required defaultValue="">
                  <option value="" disabled>{ar ? "اختر عملًا منشورًا..." : "Choose published work..."}</option>
                  {(workOptions ?? []).map((work) => <option key={work.id} value={work.id}>{work.title || (ar ? "عمل بدون عنوان" : "Untitled work")} · {work.content_type || "video"}</option>)}
                </select>
              </label>
              <label><span>{ar ? "ملاحظة (اختيارية)" : "Note (optional)"}</span><input name="note" maxLength={500} placeholder={ar ? "لماذا اخترت هذا العمل؟" : "Why does this work belong here?"} /></label>
              <button className="button primary" type="submit"><Plus size={15} />{ar ? "إضافة" : "Add work"}</button>
            </form>
            <div className={styles.managerActions}>
              <form action={updateCollectionVisibilityAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="collection_id" value={collectionId} />
                <input type="hidden" name="visibility" value={collectionRow.visibility === "public" ? "private" : "public"} />
                <button className="button secondary" type="submit">{collectionRow.visibility === "public" ? (ar ? "اجعلها خاصة" : "Make private") : (ar ? "اجعلها عامة" : "Make public")}</button>
              </form>
              <form action={deleteCollectionAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="collection_id" value={collectionId} />
                <button className={styles.deleteButton} type="submit"><Trash2 size={14} />{ar ? "حذف المجموعة" : "Delete collection"}</button>
              </form>
            </div>
          </div>
        ) : null}

        {itemsError ? (
          <div className={styles.error} role="alert">{ar ? "تعذر تحميل عناصر المجموعة." : "Could not load collection items."}</div>
        ) : orderedItems.length ? (
          <div className={styles.workGrid}>
            {orderedItems.map(({ item, work }) => (
              <article className={styles.workCard} key={item.sort_order}>
                <Link href={"/" + locale + "/watch/" + work.id} className={styles.workLink}>
                  <div className={styles.workVisual}>
                    <img src={work.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
                    {work.duration ? <span className={styles.duration}>{Math.floor(work.duration / 60)}:{String(Math.round(work.duration % 60)).padStart(2, "0")}</span> : null}
                  </div>
                  <div className={styles.workCopy}>
                    <div className="video-kicker">{work.content_type || "WORK"}{work.quality ? " · " + work.quality : ""}</div>
                    <h2>{work.title || (ar ? "عمل بدون عنوان" : "Untitled work")}</h2>
                    <p>{work.description || (ar ? "عمل إبداعي من رَافِين." : "A creative work from RAVINE.")}</p>
                    {item.note ? <blockquote>{item.note}</blockquote> : null}
                    <div className={styles.workStats}><span>{Number(work.views || 0).toLocaleString(locale)} {ar ? "مشاهدة" : "views"}</span><span>{Number(work.likes || 0).toLocaleString(locale)} {ar ? "إعجاب" : "likes"}</span></div>
                  </div>
                </Link>
                {canManage ? (
                  <form action={removeCollectionItemAction} className={styles.removeForm}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="collection_id" value={collectionId} />
                    <input type="hidden" name="sort_order" value={item.sort_order} />
                    <button type="submit"><Trash2 size={13} />{ar ? "إزالة من المجموعة" : "Remove from collection"}</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty} role="status">
            <div className={styles.emptyIcon}><BookmarkPlus size={20} aria-hidden="true" /></div>
            <strong>{ar ? "هذه المجموعة فارغة." : "This collection is empty."}</strong>
            <span>{canManage ? (ar ? "أضف عملًا عامًا للبدء في بناء مجموعتك." : "Add a public work to start building this collection.") : (ar ? "لم يضف مالك المجموعة أعمالًا بعد." : "The owner has not added any work yet.")}</span>
          </div>
        )}
      </section>
    );
  }

  const creatorIds = userId
    ? ((await supabase.from("creators").select("id").eq("user_id", userId)).data ?? []).map((row) => Number(row.id)).filter((id) => Number.isSafeInteger(id) && id > 0)
    : [];
  const collectionFilters = ["visibility.eq.public"];
  if (userId) collectionFilters.push("owner_user_id.eq." + userId);
  if (creatorIds.length) collectionFilters.push("owner_creator_id.in.(" + creatorIds.join(",") + ")");

  const { data: collectionRows, error: collectionsError } = await supabase
    .from("ravine_collections")
    .select("id,owner_user_id,owner_creator_id,title,description,visibility,created_at")
    .or(collectionFilters.join(","))
    .order("created_at", { ascending: false })
    .limit(100);
  const collections = (collectionRows ?? []) as CollectionRow[];
  const collectionIds = collections.map((collection) => collection.id);
  const { data: itemCountRows } = collectionIds.length
    ? await supabase.from("ravine_collection_items").select("collection_id").in("collection_id", collectionIds)
    : { data: [] };
  const itemCounts = new Map<string, number>();
  for (const item of (itemCountRows ?? []) as Array<{ collection_id: string }>) {
    itemCounts.set(item.collection_id, (itemCounts.get(item.collection_id) ?? 0) + 1);
  }

  const actionError = query.error && errorCopy[query.error] ? errorCopy[query.error][ar ? 0 : 1] : "";
  return (
    <section className={"section " + styles.page} dir={ar ? "rtl" : "ltr"}>
      <div className="eyebrow">RAVINE / {ar ? "المجموعات واللوحات" : "COLLECTIONS & BOARDS"}</div>
      <div className={styles.listHeader}>
        <div>
          <h1>{ar ? "اجمع الأعمال حول فكرة." : "Bring work together around an idea."}</h1>
          <p className="section-note">{ar ? "أنشئ مجموعاتك الخاصة أو شارك مجموعات عامة حول فيلم أو مزاج بصري أو موضوع إبداعي." : "Create private collections or share public boards around a film, visual mood, or creative theme."}</p>
        </div>
      </div>

      {actionError ? <div className={styles.error} role="alert">{actionError}</div> : null}
      {notice ? <p className={styles.noticeText} role="status">{notice}</p> : null}

      {userId ? (
        <form action={createCollectionAction} className={styles.createForm}>
          <input type="hidden" name="locale" value={locale} />
          <div className={styles.createIntro}><BookmarkPlus size={20} /><div><strong>{ar ? "ابدأ مجموعة جديدة." : "Start a new collection."}</strong><span>{ar ? "اختر اسمًا واضحًا، وأضف الأعمال التي تريد جمعها." : "Give it a clear title, then add the work you want to gather."}</span></div></div>
          <div className={styles.createFields}>
            <label><span>{ar ? "اسم المجموعة" : "Collection title"}</span><input name="title" maxLength={120} required placeholder={ar ? "مثلًا: مشاهد بصرية أعود إليها" : "e.g. Visual moments to revisit"} /></label>
            <label><span>{ar ? "الوصف" : "Description"}</span><input name="description" maxLength={1000} placeholder={ar ? "ما الفكرة التي تجمع هذه الأعمال؟" : "What brings these works together?"} /></label>
            <label><span>{ar ? "الظهور" : "Visibility"}</span><select name="visibility" defaultValue="private"><option value="private">{ar ? "خاصة" : "Private"}</option><option value="public">{ar ? "عامة" : "Public"}</option></select></label>
          </div>
          <button className="button primary" type="submit"><Plus size={15} />{ar ? "إنشاء المجموعة" : "Create collection"}</button>
        </form>
      ) : (
        <div className={styles.guestNotice}><strong>{ar ? "تستطيع تصفح المجموعات العامة." : "Browse public collections."}</strong><span>{ar ? "أنشئ حسابًا أو سجّل الدخول لبناء مجموعاتك وإدارتها." : "Create an account or sign in to build and manage your own collections."}</span><Link className="button primary" href={"/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/collections")}>{ar ? "دخول" : "Sign in"}</Link></div>
      )}

      {collectionsError ? (
        <div className={styles.error} role="alert"><strong>{ar ? "تعذر تحميل المجموعات." : "Collections are unavailable."}</strong><span>{ar ? "قد تحتاج سياسات قاعدة البيانات إلى التحديث قبل تشغيل المجموعات." : "Collection database policies may need to be installed before collections can operate."}</span></div>
      ) : collections.length ? (
        <RAVINECollectionsDirectory
          locale={locale}
          collections={collections.map((collection) => ({
            id: collection.id,
            title: collection.title,
            description: collection.description,
            visibility: collection.visibility,
            createdAt: collection.created_at,
            owned: Boolean(userId && (collection.owner_user_id === userId || creatorIds.includes(Number(collection.owner_creator_id)))),
            itemCount: itemCounts.get(collection.id) ?? 0,
          } satisfies RAVINECollectionDirectoryItem))}
        />
      ) : !collectionsError ? (
        <div className={styles.empty} role="status">
          <div className={styles.emptyIcon}><BookmarkPlus size={20} aria-hidden="true" /></div>
          <strong>{ar ? "لا توجد مجموعات ظاهرة بعد." : "No visible collections yet."}</strong>
          <span>{ar ? "أنشئ مجموعتك الأولى أو عُد لاحقًا لاكتشاف مجموعات المجتمع." : "Create your first collection or return later to discover community boards."}</span>
        </div>
      ) : null}
    </section>
  );
}
