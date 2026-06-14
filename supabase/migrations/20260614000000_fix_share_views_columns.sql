-- Fix: bảng share_views trên production thiếu cột (CREATE TABLE IF NOT EXISTS
-- là no-op nếu bảng đã tồn tại từ trước với schema cũ).
-- get_share_views() báo lỗi "column sv.ip does not exist".

ALTER TABLE public.share_views ADD COLUMN IF NOT EXISTS ip TEXT;
ALTER TABLE public.share_views ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.share_views ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.share_views ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE public.share_views ADD COLUMN IF NOT EXISTS device_type TEXT;
