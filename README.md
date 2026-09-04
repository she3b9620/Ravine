# RAVINE

RAVINE is a cinematic, editorial platform for creative work and the people behind it.

This branch is the clean rebuild foundation. It intentionally contains no legacy product UI or prototype flows.

## Source of Truth
- `RAVINE_Product_Design_Master_Spec_FULL_WITH_VISUAL_MODEL.docx`
- `RAVINE_Product_Design_Master_Spec_FULL_AR.docx`

## Foundation
- Next.js App Router + TypeScript
- Tailwind CSS
- next-intl
- Supabase for application data/auth/RLS
- Cloudinary planned for media infrastructure; configuration remains an open product decision
- Canonical palette and typography are defined in `app/globals.css`

## Supabase configuration
The application prefers `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` when configured in the deployment environment. The clean rebuild also contains a public fallback for the current RAVINE Supabase project so preview builds remain functional when those public environment variables are missing.

## Rebuild rule
Locked product decisions are carried forward. Open decisions remain open until explicitly decided.
