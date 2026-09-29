alter table public.empresas
  add column if not exists contrato_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contratos',
  'contratos',
  true,
  20971520,
  array['application/pdf', 'image/*']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users can upload company contracts"
on storage.objects
for insert
 to authenticated
with check (bucket_id = 'contratos');

create policy "Authenticated users can remove company contracts"
on storage.objects
for delete
 to authenticated
using (bucket_id = 'contratos');
