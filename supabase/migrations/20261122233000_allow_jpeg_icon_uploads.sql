update storage.buckets
set allowed_mime_types = array['image/png','image/jpeg','image/webp','image/svg+xml']
where id = 'zuno-icons';
