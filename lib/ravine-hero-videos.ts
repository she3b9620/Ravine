export type RavineHeroVideo =
  | {
      source: "youtube";
      id: string;
    }
  | {
      source: "local";
      src: string;
      poster?: string;
    };

/**
 * Hero video registry.
 *
 * Keep YouTube sources here when an external reference is preferred.
 * Add raw files under `public/videos/hero/` and register them as local sources:
 * { source: "local", src: "/videos/hero/my-hero-shot.mp4" }
 */
export const RAVINE_HERO_VIDEOS: RavineHeroVideo[] = [
  { source: "youtube", id: "RLKQ-cHohFc" },
  { source: "youtube", id: "O2zRehtoU1w" },
  { source: "youtube", id: "DBjjCRSXdGQ" },
  { source: "youtube", id: "Aoyx39cAjgc" },
  { source: "youtube", id: "NTwlc9Oa9BQ" },
  { source: "youtube", id: "vgdPiCr0TnQ" },
  // Local examples — uncomment/register real files as they are added.
  // { source: "local", src: "/videos/hero/hero-01.mp4" },
];
