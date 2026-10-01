create table if not exists public.avisos_sii_historial (
  id uuid primary key default gen_random_uuid(),
  nombre_archivo text not null,
  documento_url text not null,
  respuesta_sii_url text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.avisos_sii_historial enable row level security;
grant select, insert, update on public.avisos_sii_historial to authenticated;

create policy "Authenticated users can read SII notice history"
  on public.avisos_sii_historial for select to authenticated using (true);

create policy "Authenticated users can create SII notice history"
  on public.avisos_sii_historial for insert to authenticated with check (true);

create policy "Authenticated users can update SII notice history"
  on public.avisos_sii_historial for update to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avisos-sii',
  'avisos-sii',
  true,
  20971520,
  array['application/pdf', 'image/*']::text[]
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users can upload SII notices"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avisos-sii');