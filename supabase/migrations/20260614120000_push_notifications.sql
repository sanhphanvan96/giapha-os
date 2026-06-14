-- Migration: Web Push notification infrastructure (POC)
-- - push_subscriptions: lưu Web Push subscription của từng user/device
-- - profiles.notification_prefs: cấu hình bật/tắt từng loại thông báo
-- - get_push_subscriptions_for(): RPC service-role-only, trả subscriptions theo role + pref

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- User chỉ quản lý subscription của chính mình
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cấu hình per-user: loại thông báo nào được nhận (mặc định bật tất cả)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"new_contribution": true, "upcoming_events": true}'::jsonb;

UPDATE public.profiles
  SET notification_prefs = '{"new_contribution": true, "upcoming_events": true}'::jsonb
  WHERE notification_prefs IS NULL;

-- ── RPC: Lấy danh sách subscription cần gửi push, theo role + loại thông báo ──
-- CHỈ dùng từ service_role (chứa endpoint/keys, không được lộ cho anon/authenticated).
CREATE OR REPLACE FUNCTION public.get_push_subscriptions_for(p_role TEXT, p_pref_key TEXT)
RETURNS TABLE(endpoint TEXT, p256dh TEXT, auth_key TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ps.endpoint, ps.p256dh, ps.auth_key
  FROM public.push_subscriptions ps
  JOIN public.profiles p ON p.id = ps.user_id
  WHERE (p_role IS NULL OR p.role::text = p_role)
    AND COALESCE(p.notification_prefs ->> p_pref_key, 'true') = 'true';
$$;

REVOKE EXECUTE ON FUNCTION public.get_push_subscriptions_for(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_subscriptions_for(TEXT, TEXT) TO service_role;
