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
