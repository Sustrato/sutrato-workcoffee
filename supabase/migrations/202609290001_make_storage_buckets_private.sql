update storage.buckets
set public = false
where id in ('contratos', 'vouchers');

create policy "Authenticated users can view payment vouchers"
on storage.objects
for select
 to authenticated
using (bucket_id = 'vouchers');

create policy "Authenticated users can view company contracts"
on storage.objects
for select
 to authenticated
using (bucket_id = 'contratos');
