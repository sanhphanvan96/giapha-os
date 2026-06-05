-- ============================================================
-- Migration: Revert signup block + set new users as inactive (pending approval)
-- Date: 2026-06-04
-- Description:
--   1. Reverts handle_first_user_confirmation() to original (no signup block)
--   2. Updates handle_new_user() so non-first users start with is_active = false
--      requiring admin approval before they can access the dashboard.
-- ============================================================

-- 1. Revert handle_first_user_confirmation to original (just auto-confirm first user)
CREATE OR REPLACE FUNCTION public.handle_first_user_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  -- If no users exist yet, auto-confirm this first admin user
  IF NOT EXISTS (SELECT 1 FROM auth.users) THEN
    NEW.email_confirmed_at := NOW();
    NEW.last_sign_in_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Update handle_new_user so new (non-first) users are inactive by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  is_first_user boolean;
BEGIN
  -- Check if this is the first user (count will be 1 as this is AFTER INSERT)
  SELECT count(*) = 1 FROM auth.users INTO is_first_user;

  INSERT INTO public.profiles (id, role, is_active)
  VALUES (
    new.id,
    CASE WHEN is_first_user THEN 'admin'::public.user_role_enum ELSE 'member'::public.user_role_enum END,
    -- First user (admin) is immediately active; all others start inactive pending approval
    CASE WHEN is_first_user THEN true ELSE false END
  );

  RETURN new;
END;
$$;
