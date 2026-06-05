-- Fix: re-create storage SELECT policies that are missing from the live database.
--
-- Migration 20260605090743 was recorded as applied but its SELECT policies are
-- absent from pg_policy.  Without a SELECT policy on storage.objects the
-- authenticated role cannot see any rows it owns, which causes:
--   1. Upsert uploads to fail ("new row violates row-level security policy")
--      because ON CONFLICT … DO UPDATE requires visibility of the existing row.
--   2. Users cannot list or retrieve their own files.
--
-- This migration is idempotent: DROP IF EXISTS before CREATE.

-- ── avatars ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read avatars" ON storage.objects;
CREATE POLICY "Authenticated users can read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- ── gallery ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read gallery" ON storage.objects;
CREATE POLICY "Authenticated users can read gallery"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');
