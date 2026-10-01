alter table public.avisos_sii_historial
  add column if not exists respuesta_sii_url text;

grant update on public.avisos_sii_historial to authenticated;

drop policy if exists "Authenticated users can update SII notice history"
  on public.avisos_sii_historial;

create policy "Authenticated users can update SII notice history"
  on public.avisos_sii_historial for update to authenticated
  using (true)
  with check (true);

update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/*']::text[]
where id = 'avisos-sii';
