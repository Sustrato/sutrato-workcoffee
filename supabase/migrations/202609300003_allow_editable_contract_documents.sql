update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/*', 'application/msword', 'text/html']::text[]
where id = 'contratos';
