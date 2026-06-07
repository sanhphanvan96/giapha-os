/**
 * Helpers để lấy thông tin request từ Vercel headers phục vụ audit log trang chia sẻ.
 * Vercel tự động thêm x-vercel-ip-city vào mỗi request — không tốn API call.
 */

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

/**
 * Phân loại thiết bị (mobile/tablet/desktop) — dùng khi lưu vào DB.
 */
export function parseDeviceType(ua: string | null): DeviceType {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))|kindle|silk/.test(s)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|blackberry|windows phone/.test(s)) return "mobile";
  return "desktop";
}

/**
 * Nhãn hiển thị chi tiết hơn, dùng trong UI (không lưu DB).
 *
 * Ví dụ kết quả:
 *   "iPhone · iOS 17.5"
 *   "Samsung SM-S918B · Android 14"
 *   "Google Pixel 8 · Android 14"
 *   "macOS 14.5"
 *   "Windows"
 *   "iPad · iPadOS 17"
 *
 * Lưu ý: Apple đã xóa model cụ thể (iPhone 15, 14…) khỏi UA từ iOS 13
 * để bảo vệ privacy — chỉ có thể biết "iPhone" + phiên bản iOS.
 */
export function parseDeviceLabel(ua: string | null): string {
  if (!ua) return "Không xác định";

  // iPhone
  const iphoneMatch = ua.match(/\(iPhone; CPU iPhone OS ([\d_]+)/);
  if (iphoneMatch) {
    const ver = iphoneMatch[1].replace(/_/g, ".").split(".").slice(0, 2).join(".");
    return `iPhone · iOS ${ver}`;
  }

  // iPad
  const ipadMatch = ua.match(/\(iPad; CPU OS ([\d_]+)/);
  if (ipadMatch) {
    const ver = ipadMatch[1].replace(/_/g, ".").split(".").slice(0, 2).join(".");
    return `iPad · iPadOS ${ver}`;
  }

  // Android — lấy version + cố gắng nhận diện brand/model
  const androidMatch = ua.match(/Android ([\d.]+)[;,]\s*([^)]*)\)/);
  if (androidMatch) {
    const ver = androidMatch[1].split(".").slice(0, 2).join(".");
    const model = androidMatch[2]?.trim() ?? "";

    let brand = "";
    const smCode = model.match(/\b(SM-[A-Z0-9]+)\b/);
    const pixelMatch = model.match(/\b(Pixel[\w\s+]*\w)/i);
    if (smCode) {
      brand = `Samsung ${smCode[1]}`;
    } else if (pixelMatch) {
      brand = `Google ${pixelMatch[1].trim()}`;
    } else if (/^(Redmi|POCO)\b/i.test(model)) {
      // Dùng toàn bộ model string (vd "Redmi Note 12", "POCO X5 Pro")
      brand = model.split(";")[0].trim();
    } else if (/\bOPPO\b/i.test(model)) {
      brand = `OPPO ${model.replace(/.*OPPO\s*/i, "").split(/[;)]/)[0].trim()}`.trim();
    } else if (/\bvivo\b/i.test(model)) {
      brand = "vivo";
    } else if (/\bHuawei\b/i.test(model)) {
      brand = "Huawei";
    } else if (model) {
      // Fallback: lấy tối đa 24 ký tự đầu
      brand = model.split(";")[0].trim().slice(0, 24);
    }

    return brand ? `${brand} · Android ${ver}` : `Android ${ver}`;
  }

  // macOS (kiểm tra sau iOS vì UA iPhone cũng có "Mac OS X")
  const macMatch = ua.match(/\(Macintosh.*?Mac OS X ([\d_]+)/);
  if (macMatch) {
    const ver = macMatch[1].replace(/_/g, ".").split(".").slice(0, 2).join(".");
    return `macOS ${ver}`;
  }

  // Windows
  if (/Windows NT/.test(ua)) return "Windows";

  // Linux
  if (/Linux|X11/.test(ua)) return "Linux";

  return "Không xác định";
}

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
  city: string | null;
  referrer: string | null;
  deviceType: DeviceType;
}

/**
 * Đọc metadata từ headers của request Next.js (next/headers).
 *
 * - ip: x-forwarded-for (phần tử đầu) || x-real-ip
 * - city: x-vercel-ip-city (URL-encoded, cần decode) — chỉ có khi deploy Vercel
 * - referrer: referer header || null
 */
export function getRequestMeta(h: Headers): RequestMeta {
  // IP
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : (h.get("x-real-ip") ?? null);

  // User-Agent
  const userAgent = h.get("user-agent");

  // City (Vercel header, URL-encoded)
  const rawCity = h.get("x-vercel-ip-city");
  let city: string | null = null;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity);
    } catch {
      city = rawCity;
    }
  }

  // Referrer
  const referrer = h.get("referer") ?? null;

  return {
    ip,
    userAgent,
    city,
    referrer,
    deviceType: parseDeviceType(userAgent),
  };
}
