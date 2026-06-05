-- update get_shared_family_tree to return expires_at
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

  -- Xây dựng JSON trả về chứa danh sách thành viên, mối quan hệ, các sự kiện dòng họ và hạn sử dụng
  SELECT jsonb_build_object(
    'settings', COALESCE(link_rec.settings, '{}'::jsonb),
    'expires_at', link_rec.expires_at,
    'persons', (
      SELECT COALESCE(jsonb_agg(p), '[]'::jsonb)
      FROM (
        SELECT id, full_name, other_names, gender, birth_year, birth_month, birth_day, 
               death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, 
               is_deceased, is_in_law, birth_order, generation, avatar_url, updated_at,
               birth_lunar_year, birth_lunar_month, birth_lunar_day, 
               legal_birth_year, legal_birth_month, legal_birth_day, 
               birthday_remind_type
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
    ),
    'custom_events', (
      SELECT COALESCE(jsonb_agg(e), '[]'::jsonb)
      FROM (
        SELECT id, name, content, event_date, location
        FROM public.custom_events
        ORDER BY event_date ASC
      ) e
    )
  ) INTO result;

  RETURN result;
END;
$$;
