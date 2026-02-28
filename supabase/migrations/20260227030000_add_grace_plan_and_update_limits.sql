-- Add grace to plan enum if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan') THEN
    BEGIN
      ALTER TYPE plan ADD VALUE IF NOT EXISTS 'grace';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Enforce application insert limit for free + grace
CREATE OR REPLACE FUNCTION public.enforce_applications_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan text;
  v_count integer;
BEGIN
  SELECT plan INTO v_plan FROM public.profiles WHERE id = NEW.user_id;
  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;

  IF v_plan IN ('free', 'grace') THEN
    SELECT COUNT(*) INTO v_count FROM public.applications WHERE user_id = NEW.user_id;
    IF v_count >= 100 THEN
      RAISE EXCEPTION 'PLAN_LIMIT: applications max (100) exceeded';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_plan_limit ON public.applications;
CREATE TRIGGER applications_plan_limit
BEFORE INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.enforce_applications_plan_limit();
