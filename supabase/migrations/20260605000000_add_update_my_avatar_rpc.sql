-- RPC: cho phép user cập nhật avatar_url của chính mình.
-- Dùng SECURITY DEFINER để bypass RLS (profiles không có UPDATE policy cho user thường).
CREATE OR REPLACE FUNCTION public.update_my_avatar(new_avatar_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.profiles
  SET avatar_url = new_avatar_url
  WHERE id = auth.uid();
END;
$$;
