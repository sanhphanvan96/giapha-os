-- Restrict inserting into custom_events to admins and editors
DROP POLICY IF EXISTS "Authenticated users can insert custom events" ON public.custom_events;
CREATE POLICY "Admins and Editors can insert custom events" ON public.custom_events
  FOR INSERT TO authenticated
  WITH CHECK ((public.is_admin() OR public.is_editor()) AND auth.uid() = created_by);

-- Restrict inserting into gallery_items to admins and editors
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.gallery_items;
CREATE POLICY "Admins and Editors can insert gallery items" ON public.gallery_items
  FOR INSERT TO authenticated
  WITH CHECK ((public.is_admin() OR public.is_editor()) AND auth.uid() = created_by);

-- Restrict storage uploads for 'gallery' bucket to admins and editors
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Admins and Editors can upload to gallery" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery' AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')
  ));
