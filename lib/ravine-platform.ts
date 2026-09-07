export type RAVINEPlatformModule = {
  key: string;
  title: string;
  href: string;
  family: "experience" | "creator" | "social" | "community" | "live" | "discovery" | "trust" | "intelligence" | "economy";
  status: "implemented" | "foundation" | "open";
  audience: "guest" | "viewer" | "creator" | "admin" | "internal";
};

export const RAVINE_PLATFORM_MODULES: RAVINEPlatformModule[] = [
  { key: "home", title: "Home", href: "/", family: "experience", status: "implemented", audience: "guest" },
  { key: "discover", title: "Discover", href: "/discover", family: "discovery", status: "implemented", audience: "guest" },
  { key: "cuts", title: "Cuts", href: "/cuts", family: "experience", status: "implemented", audience: "viewer" },
  { key: "watch", title: "Watch / Cinema", href: "/watch", family: "experience", status: "implemented", audience: "guest" },
  { key: "works", title: "Work Universe", href: "/work", family: "experience", status: "implemented", audience: "guest" },
  { key: "creators", title: "Creator Universe", href: "/creators", family: "creator", status: "implemented", audience: "guest" },
  { key: "creator-studio", title: "Creator Studio", href: "/creator", family: "creator", status: "implemented", audience: "creator" },
  { key: "community", title: "Community", href: "/community", family: "community", status: "implemented", audience: "viewer" },
  { key: "live", title: "Live", href: "/live", family: "live", status: "implemented", audience: "viewer" },
  { key: "podcasts", title: "Podcasts", href: "/podcasts", family: "experience", status: "implemented", audience: "viewer" },
  { key: "documentaries", title: "Documentary", href: "/documentaries", family: "experience", status: "implemented", audience: "viewer" },
  { key: "radio", title: "Radio", href: "/radio", family: "experience", status: "foundation", audience: "viewer" },
  { key: "messages", title: "Messages", href: "/messages", family: "social", status: "foundation", audience: "viewer" },
  { key: "account", title: "Account", href: "/account", family: "social", status: "implemented", audience: "viewer" },
  { key: "collections", title: "Collections & Boards", href: "/collections", family: "social", status: "foundation", audience: "viewer" },
  { key: "events", title: "Events & Premieres", href: "/events", family: "live", status: "foundation", audience: "viewer" },
  { key: "spaces", title: "Spaces", href: "/spaces", family: "live", status: "foundation", audience: "viewer" },
  { key: "opportunities", title: "Opportunities", href: "/opportunities", family: "economy", status: "foundation", audience: "viewer" },
  { key: "intelligence", title: "RAVINE Intelligence", href: "/intelligence", family: "intelligence", status: "foundation", audience: "viewer" },
  { key: "trust", title: "Trust & Rights", href: "/trust", family: "trust", status: "foundation", audience: "internal" },
  { key: "admin", title: "Administration", href: "/admin", family: "trust", status: "foundation", audience: "admin" },
];

export const RAVINE_OPEN_DECISIONS = [
  "Live provider and final live infrastructure",
  "Cloudinary upload/webhook/transformation lifecycle",
  "Membership/payment provider and exact pricing/revenue share",
  "Community eligibility thresholds",
  "Future rating dimensions and ranking weights",
  "Final creator verification depth",
  "Moderation escalation matrix",
  "External creator integrations",
  "Marketplace/payment provider",
  "Mobile technology stack",
  "AI model/provider mix",
  "Long-term recording and AI-audit retention policy",
] as const;

export type RAVINEPermissionScope =
  | "account"
  | "identity"
  | "work"
  | "community"
  | "channel"
  | "live"
  | "membership"
  | "team"
  | "admin"
  | "ai-tool";

export type RAVINEAIActionClass = "read" | "recommend" | "tool" | "sensitive";

export const RAVINE_AI_RULES = {
  defaultAction: "read" as RAVINEAIActionClass,
  sensitiveRequiresHumanApproval: true,
  usesLeastPrivilege: true,
  authorizationSource: "server-side-policy",
  auditRequired: true,
  providerAgnostic: true,
  confidenceAware: true,
  privacyMinimized: true,
};

export const RAVINE_DISCOVERY_SIGNALS = [
  "watch_completion",
  "watch_time",
  "likes",
  "saves",
  "generated_follows",
  "freshness",
  "engagement",
  "creator_diversity",
  "category_relevance",
  "serendipity",
] as const;

export const RAVINE_TRUST_PIPELINE = ["detect", "understand", "policy_check", "permission_check", "validated_action", "audit"] as const;
export const RAVINE_SAFETY_LADDER = ["ALLOW", "REVIEW", "RESTRICT", "BLOCK"] as const;
export const RAVINE_LIVE_LIFECYCLE = ["scheduled", "live", "recorded", "edited_reviewed", "published_work", "clips", "discussion", "ratings_reviews"] as const;
export const RAVINE_CREATOR_LIFECYCLE = ["viewer", "creator", "verified_creator", "select_creator"] as const;
