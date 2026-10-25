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
  { source: "local", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Superman%27s%20Flight%202.0%20_%20Snyder%20Cut%20%284K%20HDR%29_compressed-O5Fg1Nq2LI8Lrou9yTbbf3PWotsZpm.mp4" },
  { source: "local", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/The%20Destroyer%20of%20Worlds%20-%20Oppenheimer_compressed-OOAurqpU7vxdqYYcW6W8uCYBUWMlrR.mp4" },
  { source: "local", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/75%20Years%20-%20Don%27t%20Waste%20Them_compressed-fUDGb9aKX8XMj4Q3M9e2wjJLOFadEN.mp4" },
  { source: "local", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bat_compressed-JZrHLy21QYzW301iUFoIiDaybQeLlY.mp4" },
  { source: "local", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Good%20Job%20-%20Whiplash_compressed-8EAKJb0Mo1IjnBhh4msFGWyyPbIWd3.mp4" },
  { source: "local", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/My%20Way%20-%20Frank%20Sinatra%20%28Epic%20Version%29_compressed-fWFCSr71IK1rmC6JgtYy5fqgr9kaXu.mp4" },
  { source: "local", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/No%20Time%20For%20Caution%20_%20Do%20Not%20Go%20Gentle%20-%20Interstellar_compressed-w5ZrlqzKjXGklHlrFU9r6mRq6J6FKJ.mp4" },
  { source: "local", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Superman%20_%20Second%20Chance_compressed-bFJFXBH1r81x0KdYAA2b10hPdAcoDm.mp4" },
  { source: "local", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/There%E2%80%99s%20a%20hero%20in%20all%20of%20us_compressed-AZOzrcOSVw1f3A0KjjkzDhSvIexVMA.mp4" },
];
