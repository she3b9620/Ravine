import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("messages route requires authentication and opens the actual inbox UI", () => {
  const route = read("../app/[locale]/messages/page.tsx");
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /auth\?next=/);
  assert.match(route, /<DirectMessages/);
  assert.match(route, /initialRecipient=\{recipient \|\| undefined\}/);
  assert.match(route, /initialCreatorId=\{creatorId\}/);
  assert.match(route, /messages-final-theme-fix\.css/);
});

test("selected inbox thread determines the recipient instead of stale compose state", () => {
  const component = read("../components/DirectMessages.tsx");
  assert.match(component, /const targetRecipientId = selectedOtherId \|\| recipientId/);
  assert.match(component, /const targetCreatorId = selected \? \(selected\.creator_id \?\? undefined\) : creatorId/);
  assert.match(component, /p_recipient_id: targetRecipientId/);
  assert.match(component, /p_creator_id: targetCreatorId \?\? null/);
});

test("saved collection loads only published public works from the current user's saved IDs", () => {
  const route = read("../app/[locale]/library/page.tsx");
  assert.match(route, /const table: "video_likes" \| "video_saves" = mode === "liked" \? "video_likes" : "video_saves"/);
  assert.match(route, /\.eq\("user_id", auth\.user\.id\)/);
  assert.match(route, /\.eq\("published", true\)/);
  assert.match(route, /\.eq\("visibility", "public"\)/);
  assert.match(route, /<SavedWorksCollection/);
});

test("saved library uses the removable searchable saved-work UI", () => {
  const route = read("../app/[locale]/library/page.tsx");
  const component = read("../components/SavedWorksCollection.tsx");
  assert.match(route, /<SavedWorksCollection locale=\{locale\} mode=\{mode\} initialItems=\{items\} loadError=\{loadError\}/);
  assert.match(component, /type="search"/);
  assert.match(component, /Most viewed/);
  assert.match(component, /Most liked/);
  assert.match(component, /removeSavedVideo\(workId\)/);
  assert.match(component, /No matching works/);
  assert.match(component, /إزالة من المحفوظات/);
  assert.match(component, /role="status"/);
});

test("saved-work removal is scoped to the authenticated user and selected video", () => {
  const actions = read("../app/actions/ravine-social.ts");
  const start = actions.indexOf("export async function removeSavedVideo(");
  const end = actions.indexOf("export async function toggleSaveWork(", start);
  assert.ok(start >= 0 && end > start);
  const removeAction = actions.slice(start, end);
  assert.match(removeAction, /await requireUser\(\)/);
  assert.match(removeAction, /\.from\("video_saves"\)/);
  assert.match(removeAction, /\.eq\("user_id", user\.id\)/);
  assert.match(removeAction, /\.eq\("video_id", videoId\)/);
  assert.match(removeAction, /AUTH_REQUIRED/);
});


test("notification links and read actions remain independent and accessible", () => {
  const page = read("../app/[locale]/notifications/page.tsx");
  const css = read("../app/[locale]/notifications/notifications.module.css");
  const start = page.indexOf("if (notification.video_id)");
  const end = page.indexOf("            return (", page.indexOf("</Link>", start));
  const videoBranch = page.slice(start, end);
  assert.match(page, /import styles from "\.\/notifications\.module\.css"/);
  assert.match(videoBranch, /className=\{styles\.link\}/);
  assert.match(videoBranch, /className=\{styles\.markRead\}/);
  assert.match(videoBranch, /Mark as read/);
  assert.match(videoBranch, /تحديد كمقروء/);
  assert.ok(videoBranch.indexOf("</Link>") < videoBranch.indexOf("<form action={markRead}>"));
  assert.match(page, /className=\{styles\.itemContent\}/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});


test("Library separates saved work from liked work and keeps each view searchable", () => {
  const page = read("../app/[locale]/library/page.tsx");
  const component = read("../components/SavedWorksCollection.tsx");
  assert.match(page, /filters\.tab === "liked"/);
  assert.match(page, /const table: "video_likes" \| "video_saves" = mode === "liked" \? "video_likes" : "video_saves"/);
  assert.match(page, /tab=liked/);
  assert.match(page, /<SavedWorksCollection locale=\{locale\} mode=\{mode\}/);
  assert.ok(component.includes('const result = isLiked ? await removeLikedVideo(workId) : await removeSavedVideo(workId)'));
  assert.match(component, /type="search"/);
  assert.match(component, /Most viewed/);
});

test("starting a new message clears the selected thread and protects manual choice during initial loading", () => {
  const component = read("../components/DirectMessages.tsx");
  assert.match(component, /const manualInboxChoice = useRef\(false\)/);
  assert.match(component, /if \(!manualInboxChoice\.current\) \{/);
  assert.match(component, /manualInboxChoice\.current = true;[\s\S]*?setSelectedId\(null\);[\s\S]*?setRecipientId\(person\.id\)/);
  assert.match(component, /manualInboxChoice\.current = true; setRecipientId\(""\); setSelectedId\(conversation\.id\)/);
  assert.match(component, /selectedOtherId \|\| recipientId/);
});

test("primary Library route uses the same searchable and removable saved-work collection", () => {
  const library = read("../app/[locale]/library/page.tsx");
  assert.match(library, /<SavedWorksCollection/);
  assert.match(library, /const table: "video_likes" \| "video_saves" = mode === "liked" \? "video_likes" : "video_saves"/);
  assert.match(library, /\.eq\("published", true\)/);
  assert.match(library, /\.eq\("visibility", "public"\)/);
  assert.match(library, /initialItems=\{items\}/);
  assert.match(library, /loadError=\{loadError\}/);
});
