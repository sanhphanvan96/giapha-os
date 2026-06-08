import { describe, it, expect } from "bun:test";
import { ContributionPayload } from "@/types";
import { isEmptyValue, formatFieldValue } from "./contributionHelpers";

// ── Guard scope logic (mirror của RPC submit_contribution) ──────────────────

/**
 * Kiểm tra payload có đúng scope không.
 * Hàm này mirror logic trong RPC `submit_contribution` để test client-side validation.
 */
function guardScope(
  payload: ContributionPayload,
  scopeIds: string[],
  allowEdit: boolean,
  allowAdd: boolean,
): { ok: boolean; error?: string } {
  const scopeSet = new Set(scopeIds);

  if (!allowEdit && payload.edits.length > 0) {
    return { ok: false, error: "Link này không cho phép sửa thông tin." };
  }

  for (const edit of payload.edits) {
    if (!scopeSet.has(edit.person_id)) {
      return {
        ok: false,
        error: `person_id ${edit.person_id} không thuộc phạm vi được phép.`,
      };
    }
  }

  if (!allowAdd && payload.new_persons.length > 0) {
    return { ok: false, error: "Link này không cho phép thêm thành viên mới." };
  }

  for (const np of payload.new_persons) {
    if (!scopeSet.has(np.parent_person_id)) {
      return {
        ok: false,
        error: `parent_person_id ${np.parent_person_id} không thuộc phạm vi được phép.`,
      };
    }
  }

  return { ok: true };
}

// ── mapEditFieldsToUpdate — filter fields hợp lệ ───────────────────────────

const ALLOWED_EDIT_FIELDS = new Set([
  "full_name", "other_names", "gender",
  "birth_year", "birth_month", "birth_day",
  "birth_lunar_year", "birth_lunar_month", "birth_lunar_day",
  "death_year", "death_month", "death_day",
  "death_lunar_year", "death_lunar_month", "death_lunar_day",
  "anniversary_lunar_year", "anniversary_lunar_month", "anniversary_lunar_day",
  "is_deceased", "note",
]);

function filterAllowedFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).filter(([k]) => ALLOWED_EDIT_FIELDS.has(k)),
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe("contributionHelpers — guardScope", () => {
  const scope = ["uuid-A", "uuid-B", "uuid-C"];

  it("edit trong scope → ok", () => {
    const payload: ContributionPayload = {
      edits: [{ person_id: "uuid-A", fields: { full_name: "Nguyễn Văn A" } }],
      new_persons: [],
    };
    expect(guardScope(payload, scope, true, false)).toEqual({ ok: true });
  });

  it("edit ngoài scope → lỗi", () => {
    const payload: ContributionPayload = {
      edits: [{ person_id: "uuid-NGOAI", fields: { full_name: "X" } }],
      new_persons: [],
    };
    const result = guardScope(payload, scope, true, false);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("uuid-NGOAI");
  });

  it("edit khi allowEdit=false → lỗi", () => {
    const payload: ContributionPayload = {
      edits: [{ person_id: "uuid-A", fields: {} }],
      new_persons: [],
    };
    const result = guardScope(payload, scope, false, false);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("không cho phép sửa");
  });

  it("new_person cha trong scope → ok", () => {
    const payload: ContributionPayload = {
      edits: [],
      new_persons: [
        {
          tempId: "t1",
          fields: { full_name: "Nguyễn Văn D" },
          parent_person_id: "uuid-B",
          relation_type: "biological_child",
        },
      ],
    };
    expect(guardScope(payload, scope, false, true)).toEqual({ ok: true });
  });

  it("new_person cha ngoài scope → lỗi", () => {
    const payload: ContributionPayload = {
      edits: [],
      new_persons: [
        {
          tempId: "t1",
          fields: {},
          parent_person_id: "uuid-NGOAI",
          relation_type: "biological_child",
        },
      ],
    };
    const result = guardScope(payload, scope, false, true);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("uuid-NGOAI");
  });

  it("add khi allowAdd=false → lỗi", () => {
    const payload: ContributionPayload = {
      edits: [],
      new_persons: [
        {
          tempId: "t1",
          fields: {},
          parent_person_id: "uuid-A",
          relation_type: "biological_child",
        },
      ],
    };
    const result = guardScope(payload, scope, false, false);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("không cho phép thêm");
  });

  it("payload rỗng luôn ok", () => {
    const payload: ContributionPayload = { edits: [], new_persons: [] };
    expect(guardScope(payload, scope, true, true)).toEqual({ ok: true });
    expect(guardScope(payload, scope, false, false)).toEqual({ ok: true });
  });

  it("nhiều edits, 1 ngoài scope → lỗi", () => {
    const payload: ContributionPayload = {
      edits: [
        { person_id: "uuid-A", fields: {} },
        { person_id: "uuid-NGOAI", fields: {} },
      ],
      new_persons: [],
    };
    expect(guardScope(payload, scope, true, false).ok).toBe(false);
  });
});

describe("contributionHelpers — filterAllowedFields", () => {
  it("giữ field hợp lệ", () => {
    const input = { full_name: "A", birth_year: 1980 };
    expect(filterAllowedFields(input)).toEqual(input);
  });

  it("loại bỏ field không được phép (VD: phone_number, avatar_url)", () => {
    const input = {
      full_name: "A",
      phone_number: "090000",
      avatar_url: "http://...",
    };
    expect(filterAllowedFields(input)).toEqual({ full_name: "A" });
  });

  it("field rỗng → rỗng", () => {
    expect(filterAllowedFields({})).toEqual({});
  });
});

describe("isEmptyValue", () => {
  it("null, undefined, '' là rỗng", () => {
    expect(isEmptyValue(null)).toBe(true);
    expect(isEmptyValue(undefined)).toBe(true);
    expect(isEmptyValue("")).toBe(true);
  });

  it("false và 0 KHÔNG phải rỗng", () => {
    expect(isEmptyValue(false)).toBe(false);
    expect(isEmptyValue(0)).toBe(false);
  });

  it("chuỗi và số hợp lệ không rỗng", () => {
    expect(isEmptyValue("abc")).toBe(false);
    expect(isEmptyValue(1990)).toBe(false);
    expect(isEmptyValue(true)).toBe(false);
  });
});

describe("formatFieldValue", () => {
  it("gender: male→Nam, female→Nữ, other→Khác, rỗng→''", () => {
    expect(formatFieldValue("gender", "male")).toBe("Nam");
    expect(formatFieldValue("gender", "female")).toBe("Nữ");
    expect(formatFieldValue("gender", "other")).toBe("Khác");
    expect(formatFieldValue("gender", null)).toBe("");
    expect(formatFieldValue("gender", undefined)).toBe("");
    expect(formatFieldValue("gender", "")).toBe("");
  });

  it("is_deceased: true→'Đã mất', false→'Còn sống', rỗng→''", () => {
    expect(formatFieldValue("is_deceased", true)).toBe("Đã mất");
    expect(formatFieldValue("is_deceased", false)).toBe("Còn sống");
    expect(formatFieldValue("is_deceased", null)).toBe("");
    expect(formatFieldValue("is_deceased", undefined)).toBe("");
  });

  it("trường số: trả String, rỗng→''", () => {
    expect(formatFieldValue("birth_year", 1990)).toBe("1990");
    expect(formatFieldValue("death_lunar_month", 3)).toBe("3");
    expect(formatFieldValue("birth_year", null)).toBe("");
    expect(formatFieldValue("birth_year", undefined)).toBe("");
  });

  it("trường text: trả String, rỗng→''", () => {
    expect(formatFieldValue("full_name", "Nguyễn Văn A")).toBe("Nguyễn Văn A");
    expect(formatFieldValue("note", "ghi chú")).toBe("ghi chú");
    expect(formatFieldValue("note", null)).toBe("");
    expect(formatFieldValue("note", "")).toBe("");
  });
});
