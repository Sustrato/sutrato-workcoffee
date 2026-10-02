create table if not exists public.payment_email_reminders (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  fecha_recordatorio date not null,
  fecha_vencimiento date not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key (empresa_id, fecha_recordatorio)
);

alter table public.payment_email_reminders enable row level security;
revoke all on public.payment_email_reminders from anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname = 'daily-payment-email-reminders';

select cron.schedule(
  'daily-payment-email-reminders',
  '0 12 * * *',
  $job$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'project_url'
      ) || '/functions/v1/send-payment-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'service_role_key'
        )
      ),
      body := jsonb_build_object('source', 'pg_cron')
    );
  $job$
);
