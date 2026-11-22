# ZUNO Icon Store

ZUNO Icon Store is the community gallery for discovering, downloading, and sharing icon artwork. It is a static React + TypeScript site hosted on GitHub Pages, with Supabase providing authentication, catalog data, likes, profiles, and public image storage.

## Features

- Browse, search, and filter the public icon catalog.
- Sort by newest, most downloaded, and most liked.
- Register with username, email, and password; confirm signup using the six-digit email OTP.
- Sign in with username and password through the `username-login` Edge Function.
- Upload PNG, WebP, and SVG icons up to 5 MB.
- Like and unlike community designs while signed in.
- Public creator profiles with editable biography and owner-only icon management.
- Download icons; the `zuno-record-download` Edge Function counts at most one download per icon, per IP fingerprint, per UTC day.
- Responsive liquid-glass UI with animated six-digit OTP cells and a canvas-based morphing glass loader.

## Stack

- React 19 + TypeScript + Vite
- GitHub Pages + GitHub Actions
- Supabase Auth, Postgres, Storage, and Edge Functions

## GitHub Pages

1. In repository Settings → Pages, select **GitHub Actions** as the source.
2. Push to `main`; the included workflow builds and deploys the site.
3. The public Supabase URL and publishable key are browser-safe. Never put a Supabase secret or service-role key in this repository or browser bundle.

## Supabase requirements

The frontend expects:

- The `zuno_icon_catalog` view with `id,title,description,category,username,asset_url,like_count,created_at,downloads,mime_type,file_size,storage_path`.
- The `zuno_icons` and `zuno_icon_likes` tables, protected by RLS.
- The `profiles` table with public username/bio data and owner-only updates.
- The public `zuno-icons` bucket with a 5 MB upload limit and PNG/WebP/SVG MIME restrictions. Storage policies must restrict writes and deletes to the authenticated user's own folder.
- The `username-login` Edge Function (included in `supabase/functions/username-login`) deployed with `verify_jwt=false`. It must resolve a username to its account and verify the password through Supabase Auth. Server-side service-role credentials must remain in the Edge Function environment.
- The `zuno-record-download` Edge Function (included in `supabase/functions/zuno-record-download`) deployed with `verify_jwt=false`. It hashes the proxy-provided client IP with an HMAC key and retains the hash only for a short rate-limit window. It uses the service-role key only server-side to call the restricted download-counter function.

For email code verification, the Supabase **Confirm signup** email template must include the six-digit `{{ .Token }}` value. The frontend calls `auth.verifyOtp({ email, token, type: "email" })` with that code. A confirmation-link-only template is not compatible with the six-digit code screen.

The `zuno_icon_download_events` table is private: RLS is enabled, and only `service_role` receives table privileges. Raw client IPs are not stored. Counts are approximate unique daily downloads, not a raw click counter. Database constraints also enforce the supported category set, a 300-character profile bio, and storage paths under the owning user ID.

## Supabase migration history

The `supabase/migrations` folder includes the recorded database migration history for the linked project, including the newer private download-event table, RLS policy/performance adjustments, and content constraints. Existing deployments that already applied these versions should not be re-applied SQL manually.

## Local development

```bash
npm install
npm run dev
npm run build
```

The public Supabase values can be overridden with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. See [docs/android-integration.md](docs/android-integration.md) for the read-only Android catalog contract.
