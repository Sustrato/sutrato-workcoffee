alter table public.pagos
  add column if not exists monto_liquido numeric(14, 2),
  add column if not exists comision_tarjeta numeric(14, 2);

update public.pagos
set monto_liquido = coalesce(monto_liquido, bruto, 0),
    comision_tarjeta = coalesce(comision_tarjeta, 0);

alter table public.pagos
  alter column comision_tarjeta set default 0,
  alter column monto_liquido set not null,
  alter column comision_tarjeta set not null;
