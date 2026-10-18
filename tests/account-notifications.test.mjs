import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("account menu links to notifications and reads the signed-in user's unread count", () => {
  const menu = read("../components/AccountMenu.tsx");
  const css = read("../app/[locale]/ravine-account-notifications.css");
  assert.match(menu, /from\("notifications"\)/);
  assert.match(menu, /\.select\("id",\{count:"exact",head:true\}\)/);
  assert.match(menu, /\.eq\("user_id",auth\.user\.id\)/);
  assert.match(menu, /\.eq\("is_read",false\)/);
  assert.match(menu, /\/notifications/);
  assert.match(menu, /الإشعارات/);
  assert.match(menu, /Notifications/);
  assert.match(menu, /unreadCount>99\?"99\+"/);
  assert.match(menu, /document\.addEventListener\("visibilitychange"/);
  assert.match(menu, /usePathname/);
  assert.ok(menu.includes("},[pathname]);"));
  assert.match(css, /\.ravine-account-notification-count/);
  assert.match(css, /data-theme="light"/);
});

test("user dashboard summarizes unread notifications and links to the inbox", () => {
  const dashboard = read("../app/[locale]/dashboard/page.tsx");
  assert.match(dashboard, /from\("notifications"\)/);
  assert.match(dashboard, /\.eq\("user_id", auth\.user\.id\)/);
  assert.match(dashboard, /\.eq\("is_read", false\)/);
  assert.match(dashboard, /Unread notifications/);
  assert.match(dashboard, /الإشعارات غير المقروءة/);
  assert.ok(dashboard.includes("/notifications"));
});


test("user dashboard summarizes liked work and links to the dedicated Library tab", () => {
  const dashboard = read("../app/[locale]/dashboard/page.tsx");
  assert.match(dashboard, /from\("video_likes"\)/);
  assert.match(dashboard, /likedCount/);
  assert.match(dashboard, /Liked work/);
  assert.match(dashboard, /أعمال أعجبتك/);
  assert.match(dashboard, /library\?tab=liked/);
  assert.match(dashboard, /icon: Heart/);
});
