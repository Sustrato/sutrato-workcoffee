create table if not exists public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_address text not null,
  user_agent text not null,
  device_hash text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_hash)
);

create index if not exists trusted_devices_user_ip_idx
  on public.trusted_devices (user_id, ip_address);

create index if not exists trusted_devices_user_device_idx
  on public.trusted_devices (user_id, device_hash);

alter table public.trusted_devices enable row level security;
revoke all on public.trusted_devices from anon, authenticated;
grant all on public.trusted_devices to service_role;

create table if not exists public.trusted_device_challenges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  challenge_id uuid not null unique,
  ip_address text not null,
  user_agent text not null,
  device_hash text not null,
  code_hash text not null,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 5),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.trusted_device_challenges enable row level security;
revoke all on public.trusted_device_challenges from anon, authenticated;
grant all on public.trusted_device_challenges to service_role;
