-- Admin ticket list RPC: includes requester_email and keeps created_at desc order.
create or replace function public.admin_list_tickets()
returns table (
  id uuid,
  user_id uuid,
  subject text,
  message text,
  status text,
  admin_note text,
  requester_email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  ) then
    raise exception 'forbidden';
  end if;

  return query
  select
    t.id,
    t.user_id,
    t.subject,
    t.message,
    t.status::text,
    t.admin_note,
    t.requester_email,
    t.created_at
  from public.support_tickets t
  order by t.created_at desc;
end;
$$;

-- Admin ticket update RPC: keeps admin check and returns requester_email too.
create or replace function public.admin_update_ticket(
  p_ticket_id uuid,
  p_status text,
  p_admin_note text default null
)
returns table (
  id uuid,
  user_id uuid,
  subject text,
  message text,
  status text,
  admin_note text,
  requester_email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  ) then
    raise exception 'forbidden';
  end if;

  update public.support_tickets t
  set
    status = p_status,
    admin_note = nullif(trim(coalesce(p_admin_note, '')), '')
  where t.id = p_ticket_id;

  return query
  select
    t.id,
    t.user_id,
    t.subject,
    t.message,
    t.status::text,
    t.admin_note,
    t.requester_email,
    t.created_at
  from public.support_tickets t
  where t.id = p_ticket_id;
end;
$$;
