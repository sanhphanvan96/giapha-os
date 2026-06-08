-- Fix: "column reference id is ambiguous" trong các RPC có RETURNS TABLE (id UUID, ...)
-- Nguyên nhân: PL/pgSQL tạo output variable "id" conflict với profiles.id trong WHERE clause.
-- Fix: qualify đầy đủ profiles.id và profiles.role.

-- ── get_contribution_links ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_contribution_links()
RETURNS TABLE (
  id UUID,
  token TEXT,
  scope_person_ids UUID[],
  allow_edit BOOLEAN,
  allow_add BOOLEAN,
  note TEXT,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN,
  created_at TIMESTAMPTZ,
  submission_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  RETURN QUERY
  SELECT
    cl.id,
    cl.token,
    cl.scope_person_ids,
    cl.allow_edit,
    cl.allow_add,
    cl.note,
    cl.expires_at,
    cl.revoked,
    cl.created_at,
    COUNT(c.id) AS submission_count
  FROM public.contribution_links cl
  LEFT JOIN public.contributions c ON c.link_id = cl.id
  GROUP BY cl.id
  ORDER BY cl.created_at DESC;
END;
$$;

-- ── get_pending_contributions ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_pending_contributions()
RETURNS TABLE (
  id UUID,
  link_id UUID,
  contributor_name TEXT,
  contributor_note TEXT,
  payload JSONB,
  status TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ,
  link_note TEXT,
  scope_person_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.link_id,
    c.contributor_name,
    c.contributor_note,
    c.payload,
    c.status,
    c.review_note,
    c.created_at,
    cl.note AS link_note,
    cl.scope_person_ids
  FROM public.contributions c
  JOIN public.contribution_links cl ON cl.id = c.link_id
  ORDER BY c.created_at DESC;
END;
$$;
