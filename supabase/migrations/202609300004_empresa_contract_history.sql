create table if not exists public.empresa_contratos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  contrato_url text not null,
  nombre_archivo text not null,
  created_at timestamptz not null default now()
);

create index if not exists empresa_contratos_empresa_created_idx
  on public.empresa_contratos (empresa_id, created_at desc);

alter table public.empresa_contratos enable row level security;

grant select, insert on public.empresa_contratos to authenticated;

create policy "Authenticated users can read company contract history"
  on public.empresa_contratos for select to authenticated using (true);

create policy "Authenticated users can add company contract history"
  on public.empresa_contratos for insert to authenticated with check (true);