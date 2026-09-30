create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  content text not null,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint contract_templates_version_unique unique (version)
);

create unique index if not exists contract_templates_one_active
  on public.contract_templates (is_active)
  where is_active;

grant select, insert, update on public.contract_templates to authenticated;

alter table public.contract_templates enable row level security;

create policy "Authenticated users can read contract templates"
  on public.contract_templates for select to authenticated using (true);

create policy "Authenticated users can create contract templates"
  on public.contract_templates for insert to authenticated with check (true);

create policy "Authenticated users can update contract templates"
  on public.contract_templates for update to authenticated using (true) with check (true);

create or replace function public.save_contract_template(template_content text)
returns public.contract_templates
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
  saved_template public.contract_templates;
begin
  perform pg_advisory_xact_lock(hashtext('contract_templates_version'));
  select coalesce(max(version), 0) + 1 into next_version from public.contract_templates;
  update public.contract_templates set is_active = false where is_active;

  insert into public.contract_templates (version, content, is_active, created_by)
  values (next_version, template_content, true, auth.uid())
  returning * into saved_template;

  return saved_template;
end;
$$;

revoke all on function public.save_contract_template(text) from public;
grant execute on function public.save_contract_template(text) to authenticated;

insert into public.contract_templates (version, content, is_active)
values (1, '<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS</h1><p>En Arica, a {{fecha_inicio}}, comparecen SUTRATO LIMITADA y {{cliente_nombre}}, RUT {{rut}}, con domicilio en {{direccion}}, representada por {{representante_legal}}.</p><h2>PRIMERO: Servicio</h2><p>El prestador proporcionará el servicio {{plan}}. Giro del cliente: {{giro}}.</p><h2>SEGUNDO: Precio y pago</h2><p>Valor neto: {{valor_neto}}, IVA: {{iva}}, total: {{total}}. Medio de pago: {{medio_pago}}.</p><h2>TERCERO: Vigencia</h2><p>El contrato comienza el {{fecha_inicio}} y se regirá por las condiciones acordadas entre las partes.</p><p>Leído el presente instrumento, las partes firman en dos ejemplares del mismo tenor.</p><p><br></p><p>_______________________________<br>SUTRATO LIMITADA<br>{{representante_legal}}</p><p>_______________________________<br>{{cliente_nombre}}<br>RUT {{rut}}</p>', true)
on conflict (version) do nothing;