# ZUNO Android icon catalog integration

The public catalog is available through the Supabase REST API:

`GET https://jlyinisqhkupddyfcdut.supabase.co/rest/v1/zuno_icon_catalog?select=id,title,description,category,username,asset_url,like_count,created_at&order=created_at.desc`

Send this request header:

`apikey: sb_publishable_sjwsqCho2mlpdzBUFQQ_dQ_2uBeSDwl`

No service-role or secret key belongs in the Android app.

Each row includes:
- `id`: stable icon ID
- `title`, `description`, `category`
- `username`: creator
- `asset_url`: public PNG/WebP/SVG URL
- `like_count`, `created_at`

For category filtering, add `&category=eq.Minimal`. For pagination, use `limit=40&offset=0`.

The Android app should treat this as an optional community source alongside its existing eight built-in icons. Do not replace or remove the built-in icons when the network is unavailable. Cache successful catalog responses and keep the built-in picker usable offline.

This endpoint is read-only for anonymous clients. Uploads and likes require an authenticated user through Supabase Auth and the website's RLS-protected tables.
