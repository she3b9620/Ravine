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

## Rebuild rule
Locked product decisions are carried forward. Open decisions remain open until explicitly decided.
