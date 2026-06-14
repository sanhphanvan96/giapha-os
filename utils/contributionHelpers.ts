/**
 * Hosts cho phép cho ảnh tạm của contribution (chống SSRF).
 * litterbox.catbox.moe = endpoint upload; litter.catbox.moe = host trả về file thực tế.
 */
export const ALLOWED_TEMP_IMAGE_HOSTS = ["litterbox.catbox.moe", "litter.catbox.moe"];

/** true nếu url là HTTPS và đúng host litterbox. Mọi input khác → false. */
export function isAllowedTempImageUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    (ALLOWED_TEMP_IMAGE_HOSTS as string[]).includes(parsed.hostname)
  );
}

export const NUMBER_FIELDS = new Set([
  "birth_year", "birth_month", "birth_day",
  "birth_lunar_year", "birth_lunar_month", "birth_lunar_day",
  "death_year", "death_month", "death_day",
  "death_lunar_year", "death_lunar_month", "death_lunar_day",
  "anniversary_lunar_year", "anniversary_lunar_month", "anniversary_lunar_day",
]);

/** null | undefined | "" là rỗng. false và 0 KHÔNG phải rỗng. */
export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/** Format giá trị một trường person sang chuỗi tiếng Việt để hiển thị diff. */
export function formatFieldValue(key: string, value: unknown): string {
  if (key === "gender") {
    if (value === "male") return "Nam";
    if (value === "female") return "Nữ";
    if (value === "other") return "Khác";
    return "";
  }
  if (key === "is_deceased") {
    if (value === true) return "Đã mất";
    if (value === false) return "Còn sống";
    return "";
  }
  if (isEmptyValue(value)) return "";
  return String(value);
}
