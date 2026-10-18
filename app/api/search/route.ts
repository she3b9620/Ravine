import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set(["video", "short", "short_film", "film", "series", "documentary", "podcast", "live"]);
const ALLOWED_FORMATS = new Set(["16:9", "9:16", "1:1", "other"]);
const ALLOWED_QUALITIES = new Set(["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2k", "4k", "4K"]);

function clean(value: string | null) {
  return (value ?? "").trim().slice(0, 120);
}

function normalizeSearchPattern(value: string) {
  return value.replace(/[,()%*\\]/g, " ").replace(/\s+/g, " ").trim();
}

type VideoSearchQuery = ReturnType<ReturnType<Awaited<ReturnType<typeof createClient>>["from"]>["select"]>;

function applyVideoFilters(query: VideoSearchQuery, params: URLSearchParams) {
  const type = clean(params.get("type"));
  const category = Number(params.get("category"));
  const duration = clean(params.get("duration"));
  const format = clean(params.get("format"));
  const quality = clean(params.get("quality"));

  let next = query.eq("published", true).eq("visibility", "public").eq("search_visible", true).limit(8);
  if (ALLOWED_TYPES.has(type)) next = next.eq("content_type", type);
  if (Number.isFinite(category) && category > 0) next = next.eq("category_id", category);

  if (duration === "under-5") next = next.lt("duration", 300);
  if (duration === "5-20") next = next.gte("duration", 300).lt("duration", 1200);
  if (duration === "20-60") next = next.gte("duration", 1200).lt("duration", 3600);
  if (duration === "over-60") next = next.gte("duration", 3600);

  if ([...ALLOWED_FORMATS].includes(format)) {
    if (format === "other") next = next.not("aspect_ratio", "in", "(16:9,9:16,1:1)");
    else next = next.eq("aspect_ratio", format);
  }

  if (ALLOWED_QUALITIES.has(quality)) {
    next = next.eq("quality", quality === "4K" ? "4k" : quality);
  }

  return next;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;
  const q = normalizeSearchPattern(clean(params.get("q")));
  const hasQuery = Boolean(q);
  const hasFilters = ["category", "type", "duration", "format", "quality"].some((key) => clean(params.get(key)));

  let videosQuery = applyVideoFilters(
    supabase
      .from("videos")
      .select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,aspect_ratio,creator_id,category_id,created_at"),
    params,
  ).order("created_at", { ascending: false });

  if (q) {
    videosQuery = applyVideoFilters(
      supabase
        .from("videos")
        .select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,aspect_ratio,creator_id,category_id,created_at"),
      params,
    )
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .order("created_at", { ascending: false });
  }

  const creatorsQuery = q
    ? supabase
        .from("creators")
        .select("id,name,username,avatar_url,bio,specialty,followers")
        .or(`name.ilike.%${q.replace(/[,()]/g, " ") }%,username.ilike.%${q.replace(/[,()]/g, " ") }%,specialty.ilike.%${q.replace(/[,()]/g, " ") }%`)
        .limit(5)
    : Promise.resolve({ data: [], error: null });
  const categoriesQuery = q
    ? supabase
        .from("categories")
        .select("id,name,slug")
        .or("name.ilike.%" + q + "%,slug.ilike.%" + q + "%")
        .order("name", { ascending: true })
        .limit(6)
    : Promise.resolve({ data: [], error: null });

  const eventsQuery = q
    ? supabase
        .from("live_events")
        .select("id,creator_id,title,description,live_type,mode,status,scheduled_at,started_at")
        .in("status", ["scheduled", "live", "ended"])
        .or("title.ilike.%" + q + "%,description.ilike.%" + q + "%")
        .order("scheduled_at", { ascending: true, nullsFirst: false })
        .limit(6)
    : Promise.resolve({ data: [], error: null });

  const communitiesQuery = q
    ? supabase
        .from("communities")
        .select("slug,type,name_en,name_ar,description_en,description_ar")
        .eq("is_active", true)
        .eq("privacy", "public")
        .or("name_en.ilike.%" + q + "%,name_ar.ilike.%" + q + "%,description_en.ilike.%" + q + "%,description_ar.ilike.%" + q + "%")
        .order("name_en", { ascending: true })
        .limit(6)
    : Promise.resolve({ data: [], error: null });

  const [videosResult, creatorsResult, categoriesResult, eventsResult, communitiesResult] = await Promise.all([
    videosQuery, creatorsQuery, categoriesQuery, eventsQuery, communitiesQuery,
  ]);

  if (videosResult.error || creatorsResult.error) {
    return NextResponse.json(
      { error: videosResult.error?.message ?? creatorsResult.error?.message ?? "Search failed." },
      { status: 500 },
    );
  }

  const videos = videosResult.data ?? [];
  const creators = creatorsResult.data ?? [];
  // Optional entity results are additive; a missing secondary catalogue must not break core work search.
  const categories = categoriesResult.data ?? [];
  const events = eventsResult.data ?? [];
  const communities = communitiesResult.data ?? [];
  const mode = hasQuery || hasFilters ? "results" : "discovery";

  return NextResponse.json({ videos, creators, categories, events, communities, mode });
}
