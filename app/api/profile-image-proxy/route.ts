import { NextRequest, NextResponse } from "next/server";
import { supabaseUrl } from "@/lib/supabase/config";

const ALLOWED_BUCKETS = new Set(["avatars", "covers"]);

function getAllowedObjectUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  let base: URL;
  try {
    base = new URL(supabaseUrl);
  } catch {
    return null;
  }

  if (url.origin !== base.origin) return null;

  const prefix = "/storage/v1/object/public/";
  if (!url.pathname.startsWith(prefix)) return null;

  const remainder = url.pathname.slice(prefix.length);
  const slash = remainder.indexOf("/");
  if (slash <= 0 || slash === remainder.length - 1) return null;

  const bucket = remainder.slice(0, slash);
  if (!ALLOWED_BUCKETS.has(bucket)) return null;

  return url;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) return new NextResponse("Missing image URL", { status: 400 });

  const imageUrl = getAllowedObjectUrl(rawUrl);
  if (!imageUrl) return new NextResponse("Invalid image URL", { status: 400 });

  try {
    const upstream = await fetch(imageUrl, {
      cache: "force-cache",
      next: { revalidate: 3600 },
    });

    if (!upstream.ok) return new NextResponse("Image unavailable", { status: upstream.status });

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("Unsupported image type", { status: 415 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Image proxy failed", { status: 502 });
  }
}
