-- Restrict SELECT policies on public storage buckets.
--
-- The original broad policies (USING bucket_id = 'x') allowed anonymous clients
-- to list all files in the bucket. Public URL downloads go through the CDN and
-- don't need a SELECT policy, but upsert uploads do (storage checks if the file
-- already exists before deciding INSERT vs UPDATE).
--
-- Fix: restrict SELECT to authenticated users only. Anonymous clients can no
-- longer list files; authenticated users (who upload) still can. Warning gone,
-- upsert unaffected.

-- avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Authenticated users can read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- gallery
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Authenticated users can read gallery"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');
