# ZUNO Android icon catalog integration

The public catalog is available through the Supabase REST API:

`GET https://jlyinisqhkupddyfcdut.supabase.co/rest/v1/zuno_icon_catalog?select=id,title,description,category,username,asset_url,like_count,created_at&order=created_at.desc`

Send this request header:

`apikey: sb_publishable_sjwsqCho2mlpdzBUFQQ_dQ_2uBeSDwl`

No service-role or secret key belongs in the Android app.

Each row includes a stable icon ID, title, description, category, creator username, public asset URL, like count, and creation time. The view also exposes `downloads`, `mime_type`, `file_size`, and `storage_path` for the website.

For category filtering, add `&category=eq.Minimal`. For pagination, use `limit=40&offset=0`.

This endpoint is read-only for anonymous clients. Uploads and likes require an authenticated user through Supabase Auth and RLS-protected tables. Treat the community catalog as optional: retain the built-in icons and offline behavior when the network is unavailable.
