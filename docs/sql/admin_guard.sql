create or replace function public.prevent_admin_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_admin_escalation on public.profiles;
create trigger trg_prevent_admin_escalation
before update on public.profiles
for each row
execute function public.prevent_admin_escalation();

create or replace function public.set_admin(target_user_id uuid, make_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  update public.profiles
  set is_admin = make_admin
  where id = target_user_id;
end;
$$;

revoke all on function public.set_admin(uuid, boolean) from public;
grant execute on function public.set_admin(uuid, boolean) to service_role;
