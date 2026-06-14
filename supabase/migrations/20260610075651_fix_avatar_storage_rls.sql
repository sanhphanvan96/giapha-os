-- Fix: avatar storage RLS — chỉ owner / admin / editor được sửa-xoá.
-- Policy cũ chỉ check auth.role()='authenticated' → mọi user (kể cả member
-- read-only) sửa/xoá được MỌI avatar. Theo pattern bucket 'gallery'.

DROP POLICY IF EXISTS "Users can update avatars." ON storage.objects;
CREATE POLICY "Users can update avatars." ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (auth.uid() = owner OR public.is_admin() OR public.is_editor())
  );

DROP POLICY IF EXISTS "Users can delete avatars." ON storage.objects;
CREATE POLICY "Users can delete avatars." ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (auth.uid() = owner OR public.is_admin() OR public.is_editor())
  );
