export const RAVINE_CREATOR_TIERS = [
  "viewer",
  "creator",
  "elevated_creator",
  "artist",
  "elevated_artist",
] as const;

export type RAVINECreatorTier = (typeof RAVINE_CREATOR_TIERS)[number];

export const RAVINE_CREATOR_CONTENT_TYPES = [
  "short",
  "video",
  "podcast",
  "documentary",
  "short_film",
  "feature_film",
] as const;

export type RAVINECreatorContentType = (typeof RAVINE_CREATOR_CONTENT_TYPES)[number];

export type RAVINECreatorCapabilities = {
  content: Record<RAVINECreatorContentType, { allowed: boolean; monthlyLimit: number | null }>;
  canStartLive: boolean;
};

/**
 * Canonical product policy for creator-tier capabilities.
 *
 * A null monthlyLimit means no tier-based monthly quota; it does not disable
 * platform-wide anti-spam, safety, rights, storage, or rate-limit controls.
 * A limit of 0 means that the tier cannot publish this content type.
 *
 * This module is a policy definition, not an authorization boundary by itself.
 * Server actions and database enforcement must validate ownership, active tier,
 * quota usage, and publication state before accepting a publish operation.
 */
const unlimited = { allowed: true, monthlyLimit: null } as const;
const unavailable = { allowed: false, monthlyLimit: 0 } as const;
const limited = (monthlyLimit: number) => ({ allowed: true, monthlyLimit });

const viewerCapabilities: RAVINECreatorCapabilities = {
  content: {
    short: unlimited,
    video: limited(10),
    podcast: unavailable,
    documentary: unavailable,
    short_film: unavailable,
    feature_film: unavailable,
  },
  canStartLive: false,
};

const creatorCapabilities: RAVINECreatorCapabilities = {
  content: {
    short: unlimited,
    video: unlimited,
    podcast: unavailable,
    documentary: unavailable,
    short_film: limited(2),
    feature_film: limited(1),
  },
  canStartLive: true,
};

const elevatedCreatorCapabilities: RAVINECreatorCapabilities = {
  content: {
    short: unlimited,
    video: unlimited,
    podcast: limited(5),
    documentary: limited(5),
    short_film: limited(2),
    feature_film: limited(1),
  },
  canStartLive: true,
};

const artistCapabilities: RAVINECreatorCapabilities = {
  content: {
    short: unlimited,
    video: unlimited,
    podcast: unlimited,
    documentary: unlimited,
    short_film: unlimited,
    feature_film: limited(3),
  },
  canStartLive: true,
};

const elevatedArtistCapabilities: RAVINECreatorCapabilities = {
  content: {
    short: unlimited,
    video: unlimited,
    podcast: unlimited,
    documentary: unlimited,
    short_film: unlimited,
    feature_film: unlimited,
  },
  canStartLive: true,
};

const CAPABILITIES: Record<RAVINECreatorTier, RAVINECreatorCapabilities> = {
  viewer: viewerCapabilities,
  creator: creatorCapabilities,
  elevated_creator: elevatedCreatorCapabilities,
  artist: artistCapabilities,
  elevated_artist: elevatedArtistCapabilities,
};

export function getRAVINECreatorCapabilities(tier: RAVINECreatorTier): RAVINECreatorCapabilities {
  return CAPABILITIES[tier];
}

export function canPublishRAVINEContent(
  tier: RAVINECreatorTier,
  contentType: RAVINECreatorContentType,
  publishedThisMonth: number,
): { allowed: boolean; reason: "allowed" | "tier_restricted" | "monthly_quota_reached" } {
  const policy = CAPABILITIES[tier].content[contentType];

  if (!policy.allowed) {
    return { allowed: false, reason: "tier_restricted" };
  }

  if (policy.monthlyLimit !== null && publishedThisMonth >= policy.monthlyLimit) {
    return { allowed: false, reason: "monthly_quota_reached" };
  }

  return { allowed: true, reason: "allowed" };
}

export function canStartRAVINELive(tier: RAVINECreatorTier): boolean {
  return CAPABILITIES[tier].canStartLive;
}
