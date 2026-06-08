-- Migration: Contribution links — cho phép đóng góp thông tin gia phả qua link ẩn danh có kiểm duyệt

-- ────────────────────────────────────────────────────────────────
-- 1. Bảng contribution_links — admin tạo link
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contribution_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  scope_person_ids UUID[] NOT NULL DEFAULT '{}',
  allow_edit BOOLEAN NOT NULL DEFAULT true,
  allow_add BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contribution_links ENABLE ROW LEVEL SECURITY;

-- Chỉ admin đọc/ghi trực tiếp qua authenticated session
CREATE POLICY "Admin manage contribution_links" ON public.contribution_links
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ────────────────────────────────────────────────────────────────
-- 2. Bảng contributions — đề xuất gửi lên, chờ duyệt
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.contribution_links(id) ON DELETE CASCADE,
  contributor_name TEXT NOT NULL,
  contributor_note TEXT,
  payload JSONB NOT NULL,
  -- payload schema:
  -- {
  --   "edits": [{"person_id": "uuid", "fields": {...}}],
  --   "new_persons": [{"tempId": "str", "fields": {...}, "parent_person_id": "uuid", "relation_type": "biological_child"|"adopted_child"}]
  -- }
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- Chỉ admin đọc/ghi trực tiếp
CREATE POLICY "Admin manage contributions" ON public.contributions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Index
CREATE INDEX IF NOT EXISTS idx_contributions_status ON public.contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_link_id ON public.contributions(link_id);
CREATE INDEX IF NOT EXISTS idx_contribution_links_token ON public.contribution_links(token);

-- ────────────────────────────────────────────────────────────────
-- 3. RPC: admin_create_contribution_link (admin only)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_contribution_link(
  p_scope UUID[],
  p_allow_edit BOOLEAN,
  p_allow_add BOOLEAN,
  p_note TEXT,
  p_expiry_days INT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_token TEXT;
  v_random TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  v_random := substr(md5(random()::text || clock_timestamp()::text), 1, 12);
  v_token := 'giapha-contrib-' || v_random;

  INSERT INTO public.contribution_links (token, scope_person_ids, allow_edit, allow_add, note, created_by, expires_at)
  VALUES (v_token, COALESCE(p_scope, '{}'), p_allow_edit, p_allow_add, p_note, auth.uid(), now() + (p_expiry_days || ' days')::interval);

  RETURN v_token;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 4. RPC: get_contribution_links (admin only)
-- ────────────────────────────────────────────────────────────────
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
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  RETURN QUERY
  SELECT
    cl.id, cl.token, cl.scope_person_ids, cl.allow_edit, cl.allow_add,
    cl.note, cl.expires_at, cl.revoked, cl.created_at,
    COUNT(c.id) AS submission_count
  FROM public.contribution_links cl
  LEFT JOIN public.contributions c ON c.link_id = cl.id
  GROUP BY cl.id
  ORDER BY cl.created_at DESC;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 5. RPC: revoke_contribution_link (admin only)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revoke_contribution_link(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  UPDATE public.contribution_links SET revoked = true WHERE token = p_token;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 6. RPC: get_contribution_context (public — validate token, trả slice person)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_contribution_context(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link RECORD;
BEGIN
  SELECT * INTO v_link
  FROM public.contribution_links
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF v_link.revoked THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'revoked');
  END IF;

  IF v_link.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'allow_edit', v_link.allow_edit,
    'allow_add', v_link.allow_add,
    'note', v_link.note,
    'expires_at', v_link.expires_at,
    'scope_person_ids', to_jsonb(v_link.scope_person_ids),
    'persons', (
      SELECT COALESCE(jsonb_agg(p ORDER BY p.generation ASC NULLS FIRST, p.birth_year ASC NULLS FIRST), '[]'::jsonb)
      FROM (
        SELECT
          id, full_name, other_names, gender,
          birth_year, birth_month, birth_day,
          birth_lunar_year, birth_lunar_month, birth_lunar_day,
          legal_birth_year, legal_birth_month, legal_birth_day,
          death_year, death_month, death_day,
          death_lunar_year, death_lunar_month, death_lunar_day,
          anniversary_lunar_year, anniversary_lunar_month, anniversary_lunar_day,
          is_deceased, is_in_law, birth_order, generation,
          avatar_url, note
        FROM public.persons
        WHERE id = ANY(v_link.scope_person_ids)
      ) p
    ),
    'relationships', (
      SELECT COALESCE(jsonb_agg(r), '[]'::jsonb)
      FROM (
        SELECT id, type, person_a, person_b
        FROM public.relationships
        WHERE person_a = ANY(v_link.scope_person_ids)
          OR person_b = ANY(v_link.scope_person_ids)
      ) r
    )
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 7. RPC: submit_contribution (public — validate token + guard scope)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_contribution(
  p_token TEXT,
  p_name TEXT,
  p_note TEXT,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link RECORD;
  v_edit JSONB;
  v_new_person JSONB;
  v_new_id UUID;
BEGIN
  SELECT * INTO v_link
  FROM public.contribution_links
  WHERE token = p_token AND revoked = false AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link không hợp lệ hoặc đã hết hạn.';
  END IF;

  -- Guard: mọi person_id trong edits phải nằm trong scope
  IF v_link.allow_edit THEN
    FOR v_edit IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'edits', '[]'::jsonb))
    LOOP
      IF NOT (v_edit->>'person_id')::UUID = ANY(v_link.scope_person_ids) THEN
        RAISE EXCEPTION 'person_id % không thuộc phạm vi được phép.', v_edit->>'person_id';
      END IF;
    END LOOP;
  ELSIF jsonb_array_length(COALESCE(p_payload->'edits', '[]'::jsonb)) > 0 THEN
    RAISE EXCEPTION 'Link này không cho phép sửa thông tin.';
  END IF;

  -- Guard: cha của người mới phải trong scope
  IF v_link.allow_add THEN
    FOR v_new_person IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'new_persons', '[]'::jsonb))
    LOOP
      IF NOT (v_new_person->>'parent_person_id')::UUID = ANY(v_link.scope_person_ids) THEN
        RAISE EXCEPTION 'Người cha/mẹ (id: %) không thuộc phạm vi được phép.', v_new_person->>'parent_person_id';
      END IF;
    END LOOP;
  ELSIF jsonb_array_length(COALESCE(p_payload->'new_persons', '[]'::jsonb)) > 0 THEN
    RAISE EXCEPTION 'Link này không cho phép thêm thành viên mới.';
  END IF;

  INSERT INTO public.contributions (link_id, contributor_name, contributor_note, payload)
  VALUES (v_link.id, trim(p_name), trim(p_note), p_payload)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 8. RPC: get_pending_contributions (admin only)
-- ────────────────────────────────────────────────────────────────
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
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  RETURN QUERY
  SELECT
    c.id, c.link_id, c.contributor_name, c.contributor_note,
    c.payload, c.status, c.review_note, c.created_at,
    cl.note AS link_note, cl.scope_person_ids
  FROM public.contributions c
  JOIN public.contribution_links cl ON cl.id = c.link_id
  ORDER BY c.created_at DESC;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 9. RPC: approve_contribution (admin only)
-- Áp payload: update persons (edits) + insert persons + relationships (new_persons)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_contribution(
  p_id UUID,
  p_review_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_contrib RECORD;
  v_edit JSONB;
  v_new_person JSONB;
  v_new_person_id UUID;
  v_fields JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  SELECT * INTO v_contrib FROM public.contributions WHERE id = p_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đề xuất không tồn tại hoặc đã xử lý.';
  END IF;

  -- Áp edits: cập nhật từng field được đề xuất
  FOR v_edit IN SELECT * FROM jsonb_array_elements(COALESCE(v_contrib.payload->'edits', '[]'::jsonb))
  LOOP
    v_fields := v_edit->'fields';
    -- Chỉ update các field cho phép (public fields)
    UPDATE public.persons SET
      full_name = COALESCE((v_fields->>'full_name'), full_name),
      other_names = COALESCE((v_fields->>'other_names'), other_names),
      gender = COALESCE((v_fields->>'gender'), gender),
      birth_year = COALESCE((v_fields->>'birth_year')::smallint, birth_year),
      birth_month = COALESCE((v_fields->>'birth_month')::smallint, birth_month),
      birth_day = COALESCE((v_fields->>'birth_day')::smallint, birth_day),
      birth_lunar_year = COALESCE((v_fields->>'birth_lunar_year')::smallint, birth_lunar_year),
      birth_lunar_month = COALESCE((v_fields->>'birth_lunar_month')::smallint, birth_lunar_month),
      birth_lunar_day = COALESCE((v_fields->>'birth_lunar_day')::smallint, birth_lunar_day),
      death_year = COALESCE((v_fields->>'death_year')::smallint, death_year),
      death_month = COALESCE((v_fields->>'death_month')::smallint, death_month),
      death_day = COALESCE((v_fields->>'death_day')::smallint, death_day),
      death_lunar_year = COALESCE((v_fields->>'death_lunar_year')::smallint, death_lunar_year),
      death_lunar_month = COALESCE((v_fields->>'death_lunar_month')::smallint, death_lunar_month),
      death_lunar_day = COALESCE((v_fields->>'death_lunar_day')::smallint, death_lunar_day),
      anniversary_lunar_year = COALESCE((v_fields->>'anniversary_lunar_year')::smallint, anniversary_lunar_year),
      anniversary_lunar_month = COALESCE((v_fields->>'anniversary_lunar_month')::smallint, anniversary_lunar_month),
      anniversary_lunar_day = COALESCE((v_fields->>'anniversary_lunar_day')::smallint, anniversary_lunar_day),
      is_deceased = COALESCE((v_fields->>'is_deceased')::boolean, is_deceased),
      note = COALESCE((v_fields->>'note'), note),
      updated_at = now()
    WHERE id = (v_edit->>'person_id')::UUID;
  END LOOP;

  -- Áp new_persons: insert person + relationship
  FOR v_new_person IN SELECT * FROM jsonb_array_elements(COALESCE(v_contrib.payload->'new_persons', '[]'::jsonb))
  LOOP
    v_fields := v_new_person->'fields';
    v_new_person_id := gen_random_uuid();

    INSERT INTO public.persons (id, full_name, other_names, gender,
      birth_year, birth_month, birth_day,
      birth_lunar_year, birth_lunar_month, birth_lunar_day,
      death_year, death_month, death_day,
      death_lunar_year, death_lunar_month, death_lunar_day,
      is_deceased, note
    ) VALUES (
      v_new_person_id,
      COALESCE(v_fields->>'full_name', '(Chưa đặt tên)'),
      v_fields->>'other_names',
      v_fields->>'gender',
      (v_fields->>'birth_year')::smallint,
      (v_fields->>'birth_month')::smallint,
      (v_fields->>'birth_day')::smallint,
      (v_fields->>'birth_lunar_year')::smallint,
      (v_fields->>'birth_lunar_month')::smallint,
      (v_fields->>'birth_lunar_day')::smallint,
      (v_fields->>'death_year')::smallint,
      (v_fields->>'death_month')::smallint,
      (v_fields->>'death_day')::smallint,
      (v_fields->>'death_lunar_year')::smallint,
      (v_fields->>'death_lunar_month')::smallint,
      (v_fields->>'death_lunar_day')::smallint,
      COALESCE((v_fields->>'is_deceased')::boolean, false),
      v_fields->>'note'
    );

    -- Insert relationship: parent → new person
    INSERT INTO public.relationships (type, person_a, person_b)
    VALUES (
      COALESCE(v_new_person->>'relation_type', 'biological_child'),
      (v_new_person->>'parent_person_id')::UUID,
      v_new_person_id
    );
  END LOOP;

  -- Đánh dấu đã duyệt
  UPDATE public.contributions
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_review_note
  WHERE id = p_id;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 10. RPC: reject_contribution (admin only)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_contribution(
  p_id UUID,
  p_review_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  UPDATE public.contributions
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_review_note
  WHERE id = p_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đề xuất không tồn tại hoặc đã xử lý.';
  END IF;
END;
$$;
