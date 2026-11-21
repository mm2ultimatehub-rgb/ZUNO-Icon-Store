# ZUNO Icon Store
A lightweight React + TypeScript foundation for the ZUNO community icon gallery.

## Stack
- GitHub Pages for static hosting
- Supabase Auth, Postgres and Storage for community features
- Vite + React + TypeScript

## GitHub Pages setup
1. In repository Settings → Pages, set the source to **GitHub Actions**.
2. The public Supabase URL and publishable key are included in the client configuration. They are designed for browser use and are protected by Row Level Security.
3. Push to `main`; the workflow builds and deploys the site.

Never put a Supabase secret/service-role key in this repository or browser bundle.

## Supabase foundation
The separate `zuno_icons` and `zuno_icon_likes` tables and the `zuno-icons` public storage bucket are provisioned with row-level security. User uploads are limited to PNG, WebP and SVG up to 5 MB. Existing community tables and files remain separate and untouched.

## Local development
```bash
cp .env.example .env
npm install
npm run dev
```

The initial UI is intentionally a functional placeholder. Replace its visual layer without removing the functions in `src/lib/iconStore.ts`.

For the ZUNO Android app's read-only community catalog contract, see [`docs/android-integration.md`](docs/android-integration.md). The app can fetch community icons while preserving its eight built-in icons and offline behavior.
