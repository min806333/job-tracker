alter table if exists public.support_tickets
  add column if not exists requester_email text null;

update public.support_tickets t
set requester_email = u.email
from auth.users u
where t.requester_email is null
  and t.user_id = u.id;

create index if not exists support_tickets_requester_email_idx
  on public.support_tickets (requester_email);
