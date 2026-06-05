/**
 * Trả về URL đã đi qua Next Image Optimizer cho remote Supabase URL.
 * Local Supabase (127.0.0.1/localhost) hoặc URL không phải Supabase → trả nguyên gốc
 * (dev đang chạy `unoptimized: true` nên không cần transform).
 *
 * Dùng cho context không thể sử dụng <Image> từ next/image, ví dụ D3 SVG attribute.
 */

// Tập hợp giá trị w hợp lệ của /_next/image (imageSizes ∪ deviceSizes mặc định của Next.js)
const ALLOWED_W = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200] as const;
type AllowedW = (typeof ALLOWED_W)[number];

function nearestAllowedWidth(size: number): AllowedW {
  return (
    (ALLOWED_W.find((w) => w >= size) ?? 384) as AllowedW
  );
}

const SUPABASE_STORAGE_RE =
  /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//;

export function optimizedAvatarHref(
  url: string,
  size = 128,
  quality = 75,
): string {
  if (!url) return url;
  // Chỉ optimize URL public Supabase prod (https *.supabase.co/storage/…)
  if (!SUPABASE_STORAGE_RE.test(url)) {
    return url;
  }
  const w = nearestAllowedWidth(size);
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${quality}`;
}
