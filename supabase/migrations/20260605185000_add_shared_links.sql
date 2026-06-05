-- Migration: Add shared_links table and secure retrieval RPC
CREATE TABLE IF NOT EXISTS public.shared_links (
  token TEXT PRIMARY KEY,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Admins and editors can do everything
CREATE POLICY "Admins and editors can manage shared_links" ON public.shared_links
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_editor());

-- Anyone can read (needed to check if token exists)
CREATE POLICY "Anyone can view shared_links" ON public.shared_links
  FOR SELECT TO public USING (true);

-- Secure RPC to fetch tree data bypassing RLS only if token is valid and not expired
CREATE OR REPLACE FUNCTION public.get_shared_family_tree(share_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  link_rec record;
  result jsonb;
BEGIN
  -- Kiểm tra token có tồn tại và chưa hết hạn hay không
  SELECT * FROM public.shared_links
  WHERE token = share_token AND expires_at > NOW()
  INTO link_rec;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Xây dựng JSON trả về chứa danh sách thành viên và mối quan hệ
  SELECT jsonb_build_object(
    'settings', COALESCE(link_rec.settings, '{}'::jsonb),
    'persons', (
      SELECT COALESCE(jsonb_agg(p), '[]'::jsonb)
      FROM (
        -- Chỉ lấy các thông tin công khai của thành viên gia phả
        SELECT id, full_name, other_names, gender, birth_year, birth_month, birth_day, 
               death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, 
               is_deceased, is_in_law, birth_order, generation, avatar_url, updated_at
        FROM public.persons
        ORDER BY generation ASC NULLS FIRST, birth_year ASC NULLS FIRST
      ) p
    ),
    'relationships', (
      SELECT COALESCE(jsonb_agg(r), '[]'::jsonb)
      FROM (
        SELECT id, type, person_a, person_b, note, created_at, updated_at
        FROM public.relationships
      ) r
    )
  ) INTO result;

  RETURN result;
END;
$$;
