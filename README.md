# ZUNO Icon Store
A lightweight React + TypeScript foundation for the ZUNO community icon gallery.

## Stack
- GitHub Pages for static hosting
- Supabase Auth, Postgres and Storage for community features
- Vite + React + TypeScript

## GitHub Pages setup
1. In repository Settings → Pages, set the source to **GitHub Actions**.
2. In Settings → Secrets and variables → Actions → Variables, add:
   - `VITE_SUPABASE_URL` = `https://jlyinisqhkupddyfcdut.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the Supabase publishable key
3. Push to `main`; the workflow builds and deploys the site.

The publishable key is intended for browser use. Never put a Supabase secret/service-role key in this repository or browser bundle.

## Supabase foundation
The separate `zuno_icons` and `zuno_icon_likes` tables and the `zuno-icons` public storage bucket are provisioned with row-level security. User uploads are limited to PNG, WebP and SVG up to 5 MB. Existing community tables and files remain separate and untouched.

## Local development
```bash
cp .env.example .env
npm install
npm run dev
```

The initial UI is intentionally a functional placeholder. Replace its visual layer without removing the functions in `src/lib/iconStore.ts`.
