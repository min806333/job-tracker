CREATE OR REPLACE FUNCTION public.enforce_applications_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  user_plan text;
  max_apps integer;
  c integer;
begin
  -- 사용자 플랜 조회
  select plan into user_plan
  from public.profiles
  where id = new.user_id;

  -- 프로필 없으면 free 취급
  if user_plan is null then
    user_plan := 'free';
  end if;

  -- ? free + grace 는 제한, pro만 무제한
  if user_plan in ('free', 'grace') then
    max_apps := 100;
  else
    return new;       -- pro는 제한 없음
  end if;

  -- 현재 개수 조회
  select count(*) into c
  from public.applications
  where user_id = new.user_id;

  if c >= max_apps then
    raise exception 'PLAN_LIMIT: applications max (%) exceeded', max_apps;
  end if;

  return new;
end;
$function$;