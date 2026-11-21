# ZUNO Icon Store

ZUNO Icon Store is the community gallery for discovering and sharing icon artwork. It is a static React + TypeScript site hosted on GitHub Pages, with Supabase providing authentication, catalog data, likes and public image storage.

## Features

- Browse the public icon catalog and search by title.
- Filter by Minimal, Dark, Colorful, Gradient and Other.
- Register with username, email and password.
- Sign in with username and password through the `username-login` Supabase Edge Function.
- Upload PNG, WebP or SVG icon artwork (maximum 5 MB).
- Like and unlike community designs while signed in.
- Responsive liquid-glass interface for mobile and desktop.

## Stack

- Vite + React + TypeScript
- GitHub Pages via GitHub Actions
- Supabase Auth, Postgres, Storage and Edge Functions

## GitHub Pages

1. In repository Settings → Pages, set the source to **GitHub Actions**.
2. The public Supabase URL and publishable key are included in `src/lib/supabase.ts`. These are browser-safe publishable credentials; database and storage access must remain protected by Row Level Security.
3. Push to `main`; the workflow builds and deploys the site.

Never put a Supabase secret or service-role key in this repository or browser bundle.

## Supabase requirements

The frontend expects the existing Supabase project and schema to provide:

- The read-only `zuno_icon_catalog` view with `id,title,description,category,username,asset_url,like_count,created_at`.
- The `zuno_icons` table and public `zuno-icons` storage bucket for uploads.
- The `zuno_icon_likes` table with RLS policies that allow users to manage only their own likes.
- The `username-login` Edge Function. It must resolve a username to the corresponding account and return a Supabase Auth session only after verifying the password. Do not expose password hashes or service-role credentials to the browser.

User uploads are limited in the client to PNG, WebP and SVG up to 5 MB. Enforce file size, MIME type, ownership and authorization again with Supabase Storage policies/database constraints; client checks alone are not security controls.

If email confirmation is enabled in Supabase Auth, new users must verify their email before a session is created.

## Local development

```bash
npm install
npm run dev
npm run build
```

For the ZUNO Android app's read-only community catalog contract, see [docs/android-integration.md](docs/android-integration.md). The Android app should retain its built-in icons and offline behavior when the network is unavailable.
