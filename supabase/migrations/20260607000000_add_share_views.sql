-- Migration: Thêm bảng share_views để theo dõi lượt xem trang chia sẻ công khai

CREATE TABLE IF NOT EXISTS public.share_views (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token TEXT NOT NULL REFERENCES public.shared_links(token) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip TEXT,
  user_agent TEXT,
  city TEXT,
  referrer TEXT,
  device_type TEXT  -- 'mobile' | 'tablet' | 'desktop' | 'unknown'
);

CREATE INDEX idx_share_views_token_time ON public.share_views (token, viewed_at DESC);

ALTER TABLE public.share_views ENABLE ROW LEVEL SECURITY;

-- Chỉ admin được SELECT; INSERT chỉ qua RPC SECURITY DEFINER (không có policy INSERT)
CREATE POLICY "Admins can read share_views" ON public.share_views
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ── RPC: Ghi 1 lượt xem (anon có thể gọi, DEFINER tự xử lý) ─────────────────
-- Chỉ ghi nếu token tồn tại và chưa hết hạn.
-- Cleanup lazy-throttled: ~5% số lần gọi → xóa các dòng > 30 ngày.
CREATE OR REPLACE FUNCTION public.log_share_view(
  p_token    TEXT,
  p_ip       TEXT,
  p_ua       TEXT,
  p_city     TEXT,
  p_referrer TEXT,
  p_device   TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Chỉ ghi nếu token hợp lệ và chưa hết hạn
  IF NOT EXISTS (
    SELECT 1 FROM public.shared_links
    WHERE token = p_token AND expires_at > NOW()
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.share_views (token, ip, user_agent, city, referrer, device_type)
  VALUES (p_token, p_ip, p_ua, p_city, p_referrer, p_device);

  -- Lazy cleanup: ~5% lần gọi → xóa log > 30 ngày
  IF random() < 0.05 THEN
    DELETE FROM public.share_views WHERE viewed_at < NOW() - INTERVAL '30 days';
  END IF;
END;
$$;

-- ── RPC: Tổng hợp lượt xem theo token (chỉ admin) ───────────────────────────
CREATE OR REPLACE FUNCTION public.get_share_view_stats()
RETURNS TABLE(token TEXT, total_views BIGINT, last_viewed TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  RETURN QUERY
  SELECT sv.token, COUNT(*)::BIGINT AS total_views, MAX(sv.viewed_at) AS last_viewed
  FROM public.share_views sv
  GROUP BY sv.token;
END;
$$;

-- ── RPC: Nhật ký chi tiết 1 link (chỉ admin) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_share_views(p_token TEXT, p_limit INT DEFAULT 100)
RETURNS TABLE(
  viewed_at   TIMESTAMPTZ,
  ip          TEXT,
  user_agent  TEXT,
  city        TEXT,
  referrer    TEXT,
  device_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  RETURN QUERY
  SELECT sv.viewed_at, sv.ip, sv.user_agent, sv.city, sv.referrer, sv.device_type
  FROM public.share_views sv
  WHERE sv.token = p_token
  ORDER BY sv.viewed_at DESC
  LIMIT p_limit;
END;
$$;
