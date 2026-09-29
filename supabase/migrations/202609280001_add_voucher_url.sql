alter table public.pagos
  add column if not exists voucher_url text;

insert into storage.buckets (id, name, public)
values ('vouchers', 'vouchers', true)
on conflict (id) do update set public = excluded.public;

create policy "Authenticated users can upload payment vouchers"
on storage.objects
for insert
 to authenticated
with check (bucket_id = 'vouchers');

create policy "Authenticated users can remove payment vouchers"
on storage.objects
for delete
 to authenticated
using (bucket_id = 'vouchers');
