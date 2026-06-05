-- =========================================================
-- Migration: Add person_id and avatar_url to profiles
-- Also adds RPCs for linking users to persons
-- =========================================================

-- 1. Add missing avatar_url column (reconcile schema drift — already in use at runtime)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Add person_id column: links a profile to a persons row (nullable, no UNIQUE)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL;

-- Index for reverse lookup (persons → which users are linked)
CREATE INDEX IF NOT EXISTS idx_profiles_person_id ON public.profiles(person_id);

-- =========================================================
-- 3. RPC: set_my_person — self-service link/unlink
--    Only touches auth.uid() row; client never sends a userId param
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_my_person(target_person_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.profiles
  SET person_id = target_person_id
  WHERE id = auth.uid();
END;
$$;

-- =========================================================
-- 4. RPC: admin_set_user_person — admin-only assignment
--    Admin check mirrors set_user_role / delete_user pattern
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_set_user_person(
  target_user_id uuid,
  target_person_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  UPDATE public.profiles
  SET person_id = target_person_id
  WHERE id = target_user_id;
END;
$$;

-- =========================================================
-- 5. Redefine admin_user_data type and get_admin_users RPC
--    to include person_id + person_full_name
-- =========================================================
DROP TYPE IF EXISTS public.admin_user_data CASCADE;
CREATE TYPE public.admin_user_data AS (
    id uuid,
    email text,
    role public.user_role_enum,
    created_at timestamptz,
    is_active boolean,
    person_id uuid,
    person_full_name text
);

CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS SETOF public.admin_user_data
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    RETURN QUERY
    SELECT
        au.id,
        au.email::text,
        p.role,
        au.created_at,
        p.is_active,
        p.person_id,
        pe.full_name
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    LEFT JOIN public.persons pe ON p.person_id = pe.id
    ORDER BY au.created_at DESC;
END;
$$;

-- =========================================================
-- 6. RPC: update_my_email — change own email without confirmation
--    Writes directly to auth.users (same pattern as admin_create_user),
--    bypassing Supabase's "Secure email change" confirmation flow.
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_my_email(new_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET
    email = new_email,
    email_confirmed_at = now(),
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;
