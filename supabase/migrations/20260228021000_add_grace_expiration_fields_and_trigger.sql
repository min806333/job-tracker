ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grace_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS grace_ends_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_grace_ends_at_active
  ON public.profiles (grace_ends_at)
  WHERE plan = 'grace' AND grace_ends_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_profile_grace_window()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.plan = 'grace' THEN
    IF NEW.grace_started_at IS NULL THEN
      NEW.grace_started_at := now();
    END IF;

    IF NEW.grace_ends_at IS NULL THEN
      NEW.grace_ends_at := now() + interval '7 days';
    END IF;
  ELSIF NEW.plan IN ('free', 'pro') THEN
    NEW.grace_started_at := NULL;
    NEW.grace_ends_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_grace_window ON public.profiles;
CREATE TRIGGER profiles_sync_grace_window
BEFORE INSERT OR UPDATE OF plan, grace_started_at, grace_ends_at
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_grace_window();

UPDATE public.profiles
SET
  grace_started_at = COALESCE(grace_started_at, now()),
  grace_ends_at = COALESCE(grace_ends_at, now() + interval '7 days')
WHERE plan = 'grace';

UPDATE public.profiles
SET
  grace_started_at = NULL,
  grace_ends_at = NULL
WHERE plan IN ('free', 'pro');
