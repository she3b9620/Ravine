import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const upload = read("../components/StudioUpload.tsx");
const cleanup = read("../app/api/studio/cleanup-uploads/route.ts");
const deleteWork = read("../app/api/studio/delete-work/route.ts");
const signature = read("../app/api/studio/cloudinary-signature/route.ts");

test("Studio records every successful Cloudinary upload immediately for rollback", () => {
  assert.match(upload, /const uploadedPublicIds: string\[\] = \[\]/);
  assert.match(upload, /if \(mainUpload\.public_id\) uploadedPublicIds\.push\(mainUpload\.public_id\)/);
  assert.match(upload, /if \(trailerUpload\?\.public_id\) uploadedPublicIds\.push\(trailerUpload\.public_id\)/);
  assert.match(upload, /if \(previewUpload\?\.public_id\) uploadedPublicIds\.push\(previewUpload\.public_id\)/);
  const main = upload.indexOf("uploadedPublicIds.push(mainUpload.public_id)");
  const trailer = upload.indexOf("uploadedPublicIds.push(trailerUpload.public_id)");
  const preview = upload.indexOf("uploadedPublicIds.push(previewUpload.public_id)");
  const previewUploadAttempt = upload.indexOf("const previewUpload = previewFile");
  assert.ok(main >= 0 && trailer > main && preview > trailer);
  assert.ok(preview < previewUploadAttempt + 300);
});

test("a partial database work creation is deleted before the remaining temporary uploads are cleaned", () => {
  assert.match(upload, /let createdWorkId: number \| null = null/);
  assert.match(upload, /createdWorkId = Number\(work\.id\)/);
  assert.match(upload, /fetch\("\/api\/studio\/delete-work"/);
  assert.match(upload, /fetch\("\/api\/studio\/cleanup-uploads"/);
  assert.match(upload, /mayCleanUploads = deleteResponse\.ok && deletePayload\.ok === true/);
  assert.match(upload, /Check Studio for a retained draft before uploading again/);
  const rollback = upload.indexOf('fetch("/api/studio/delete-work"');
  const cleanupRequest = upload.indexOf('fetch("/api/studio/cleanup-uploads"');
  assert.ok(rollback >= 0 && cleanupRequest > rollback);
  assert.ok(upload.indexOf("} catch (submitError)") < rollback);
});

test("the temporary cleanup endpoint validates signed-in creator ownership and exact generated public IDs", () => {
  assert.match(cleanup, /supabase\.auth\.getUser\(\)/);
  assert.match(cleanup, /\.eq\("id", creatorId\)/);
  assert.match(cleanup, /\.eq\("user_id", auth\.user\.id\)/);
  assert.ok(cleanup.includes("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"));
  assert.match(cleanup, /publicIds\.length > 3/);
  assert.match(cleanup, /CLOUDINARY_API_SECRET/);
  assert.match(cleanup, /createHash\("sha1"\)/);
  assert.match(cleanup, /payload\.result === "ok" \|\| payload\.result === "not found"/);
  assert.match(signature, /randomUUID\(\)/);
  assert.ok(signature.includes("const publicId ="));
});

test("cleanup checks every uploaded ID against work and media metadata before destroying any asset", () => {
  assert.ok(cleanup.includes('supabase.from("videos").select("id").ilike("video_url", `%${publicId}%`)'));
  assert.ok(cleanup.includes('supabase.from("work_media_assets").select("id").eq("public_id", publicId)'));
  assert.ok(cleanup.includes('supabase.from("work_media_assets").select("id").ilike("media_url", `%${publicId}%`)'));
  assert.ok(cleanup.includes("if (referenceChecks.some((check) => check.queryFailed))"));
  assert.ok(cleanup.includes("if (referenceChecks.some((check) => check.referenced))"));
  const preflight = cleanup.indexOf("const referenceChecks = await Promise.all");
  const destroy = cleanup.indexOf("for (const publicId of publicIds as string[])");
  assert.ok(preflight > 0 && destroy > preflight);
});

test("upload rollback attempts work cleanup even if no public ID was returned and tracks new series metadata", () => {
  assert.ok(upload.includes("let createdSeriesId: number | null = null"));
  assert.ok(upload.includes("createdSeriesId = seriesId"));
  assert.ok(upload.includes("if (uploadedPublicIds.length || createdWorkId !== null || createdSeriesId !== null)"));
  assert.ok(upload.includes('.eq("series_id", createdSeriesId)'));
  assert.ok(upload.includes('.from("ravine_series_titles")'));
  assert.ok(upload.includes("if (!mayCleanUploads && uploadedPublicIds.length)"));
});

test("rollback requests do not permit deletion of arbitrary public IDs or another creator's work", () => {
  assert.match(cleanup, /publicIds\.every\(\(id\) => isCreatorUploadPublicId\(id, creatorId\)\)/);
  assert.match(cleanup, /The requested media identifiers are not valid for this creator/);
  assert.match(cleanup, /Creator ownership could not be verified/);
  assert.doesNotMatch(cleanup, /videoUrl\?: string/);
  assert.match(deleteWork, /if \(!ownsViaCreator\)/);
});
