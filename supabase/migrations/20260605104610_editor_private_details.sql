-- Allow editors (and admins) to view and manage person_details_private.
-- Previously admin-only. Editors (anh/em in the family) are trusted
-- to enter private info (phone, occupation, residence) but cannot
-- import/export or manage accounts.

DROP POLICY IF EXISTS "Admins can view private details" ON public.person_details_private;
CREATE POLICY "Admins and Editors can view private details"
  ON public.person_details_private FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_editor());

DROP POLICY IF EXISTS "Admins can manage private details" ON public.person_details_private;
CREATE POLICY "Admins and Editors can manage private details"
  ON public.person_details_private FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_editor());