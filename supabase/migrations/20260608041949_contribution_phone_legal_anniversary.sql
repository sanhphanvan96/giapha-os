-- Migration: approve_contribution ghi thêm legal_birth_*, anniversary_lunar_* vào persons
-- và upsert phone_number vào person_details_private khi payload có trường đó.
-- Enum casts giữ nguyên từ 20260607100300.
-- DROP trước vì PostgreSQL không cho CREATE OR REPLACE khi return type thay đổi.

DROP FUNCTION IF EXISTS public.approve_contribution(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.approve_contribution(
  p_id UUID,
  p_review_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_contrib RECORD;
  v_edit JSONB;
  v_new_person JSONB;
  v_new_person_id UUID;
  v_edit_person_id UUID;
  v_fields JSONB;
  v_map JSONB := '{}'::jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  SELECT * INTO v_contrib FROM public.contributions WHERE contributions.id = p_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đề xuất không tồn tại hoặc đã xử lý.';
  END IF;

  -- Áp edits: cập nhật từng field được đề xuất
  FOR v_edit IN SELECT * FROM jsonb_array_elements(COALESCE(v_contrib.payload->'edits', '[]'::jsonb))
  LOOP
    v_fields := v_edit->'fields';
    v_edit_person_id := (v_edit->>'person_id')::UUID;

    UPDATE public.persons SET
      full_name                = COALESCE(v_fields->>'full_name', full_name),
      other_names              = COALESCE(v_fields->>'other_names', other_names),
      gender                   = COALESCE((v_fields->>'gender')::public.gender_enum, gender),
      birth_year               = COALESCE((v_fields->>'birth_year')::smallint, birth_year),
      birth_month              = COALESCE((v_fields->>'birth_month')::smallint, birth_month),
      birth_day                = COALESCE((v_fields->>'birth_day')::smallint, birth_day),
      birth_lunar_year         = COALESCE((v_fields->>'birth_lunar_year')::smallint, birth_lunar_year),
      birth_lunar_month        = COALESCE((v_fields->>'birth_lunar_month')::smallint, birth_lunar_month),
      birth_lunar_day          = COALESCE((v_fields->>'birth_lunar_day')::smallint, birth_lunar_day),
      legal_birth_year         = COALESCE((v_fields->>'legal_birth_year')::smallint, legal_birth_year),
      legal_birth_month        = COALESCE((v_fields->>'legal_birth_month')::smallint, legal_birth_month),
      legal_birth_day          = COALESCE((v_fields->>'legal_birth_day')::smallint, legal_birth_day),
      death_year               = COALESCE((v_fields->>'death_year')::smallint, death_year),
      death_month              = COALESCE((v_fields->>'death_month')::smallint, death_month),
      death_day                = COALESCE((v_fields->>'death_day')::smallint, death_day),
      death_lunar_year         = COALESCE((v_fields->>'death_lunar_year')::smallint, death_lunar_year),
      death_lunar_month        = COALESCE((v_fields->>'death_lunar_month')::smallint, death_lunar_month),
      death_lunar_day          = COALESCE((v_fields->>'death_lunar_day')::smallint, death_lunar_day),
      anniversary_lunar_year   = COALESCE((v_fields->>'anniversary_lunar_year')::smallint, anniversary_lunar_year),
      anniversary_lunar_month  = COALESCE((v_fields->>'anniversary_lunar_month')::smallint, anniversary_lunar_month),
      anniversary_lunar_day    = COALESCE((v_fields->>'anniversary_lunar_day')::smallint, anniversary_lunar_day),
      is_deceased              = COALESCE((v_fields->>'is_deceased')::boolean, is_deceased),
      note                     = COALESCE(v_fields->>'note', note),
      updated_at               = now()
    WHERE persons.id = v_edit_person_id;

    -- Ghi phone_number vào person_details_private nếu payload có trường này
    IF v_fields ? 'phone_number' AND (v_fields->>'phone_number') IS NOT NULL AND (v_fields->>'phone_number') <> '' THEN
      INSERT INTO public.person_details_private (person_id, phone_number)
      VALUES (v_edit_person_id, v_fields->>'phone_number')
      ON CONFLICT (person_id) DO UPDATE SET phone_number = EXCLUDED.phone_number;
    END IF;
  END LOOP;

  -- Áp new_persons: insert person + relationship, thu thập mapping tempId → uuid
  FOR v_new_person IN SELECT * FROM jsonb_array_elements(COALESCE(v_contrib.payload->'new_persons', '[]'::jsonb))
  LOOP
    v_fields := v_new_person->'fields';
    v_new_person_id := gen_random_uuid();

    INSERT INTO public.persons (
      id, full_name, other_names, gender,
      birth_year, birth_month, birth_day,
      birth_lunar_year, birth_lunar_month, birth_lunar_day,
      legal_birth_year, legal_birth_month, legal_birth_day,
      death_year, death_month, death_day,
      death_lunar_year, death_lunar_month, death_lunar_day,
      anniversary_lunar_year, anniversary_lunar_month, anniversary_lunar_day,
      is_deceased, note
    ) VALUES (
      v_new_person_id,
      COALESCE(v_fields->>'full_name', '(Chưa đặt tên)'),
      v_fields->>'other_names',
      COALESCE((v_fields->>'gender')::public.gender_enum, 'other'::public.gender_enum),
      (v_fields->>'birth_year')::smallint,
      (v_fields->>'birth_month')::smallint,
      (v_fields->>'birth_day')::smallint,
      (v_fields->>'birth_lunar_year')::smallint,
      (v_fields->>'birth_lunar_month')::smallint,
      (v_fields->>'birth_lunar_day')::smallint,
      (v_fields->>'legal_birth_year')::smallint,
      (v_fields->>'legal_birth_month')::smallint,
      (v_fields->>'legal_birth_day')::smallint,
      (v_fields->>'death_year')::smallint,
      (v_fields->>'death_month')::smallint,
      (v_fields->>'death_day')::smallint,
      (v_fields->>'death_lunar_year')::smallint,
      (v_fields->>'death_lunar_month')::smallint,
      (v_fields->>'death_lunar_day')::smallint,
      (v_fields->>'anniversary_lunar_year')::smallint,
      (v_fields->>'anniversary_lunar_month')::smallint,
      (v_fields->>'anniversary_lunar_day')::smallint,
      COALESCE((v_fields->>'is_deceased')::boolean, false),
      v_fields->>'note'
    );

    INSERT INTO public.relationships (type, person_a, person_b)
    VALUES (
      COALESCE(v_new_person->>'relation_type', 'biological_child')::public.relationship_type_enum,
      (v_new_person->>'parent_person_id')::UUID,
      v_new_person_id
    );

    -- Ghi phone_number vào person_details_private nếu payload có trường này
    IF v_fields ? 'phone_number' AND (v_fields->>'phone_number') IS NOT NULL AND (v_fields->>'phone_number') <> '' THEN
      INSERT INTO public.person_details_private (person_id, phone_number)
      VALUES (v_new_person_id, v_fields->>'phone_number')
      ON CONFLICT (person_id) DO UPDATE SET phone_number = EXCLUDED.phone_number;
    END IF;

    -- Ghi nhớ tempId → uuid để action phía trên copy avatar
    IF v_new_person->>'tempId' IS NOT NULL THEN
      v_map := v_map || jsonb_build_object(v_new_person->>'tempId', v_new_person_id::text);
    END IF;
  END LOOP;

  UPDATE public.contributions
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_review_note
  WHERE contributions.id = p_id;

  RETURN jsonb_build_object('new_person_ids', v_map);
END;
$$;
