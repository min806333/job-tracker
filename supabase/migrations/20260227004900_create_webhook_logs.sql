create table if not exists public.webhook_logs (
  event_id text primary key,
  event_type text not null,
  object_id text null,
  severity text not null check (severity in ('info', 'warn', 'error')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists webhook_logs_created_at_idx
  on public.webhook_logs (created_at desc);

create index if not exists webhook_logs_event_type_idx
  on public.webhook_logs (event_type);
