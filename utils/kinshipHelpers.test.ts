import { describe, it, expect } from "bun:test";
import {
  computeKinship,
  computeEgoLabels,
  type PersonNode,
  type RelEdge,
} from "./kinshipHelpers";

// ── Test dataset ──────────────────────────────────────────────────────────────
//
//   A (m,gen1) ─── B (f,gen1)       ← Ông nội / Bà nội
//       |
//   ┌───┴──────┐
//   C (m,gen2) D (f,gen2)
//   │           │
//   E (f,in-law) G (m,in-law)
//   │           │
//   F (m,gen3) H (f,gen3)           ← F=Cháu nội, H=Cháu ngoại

const A: PersonNode = {
  id: "A",
  full_name: "Ông A",
  gender: "male",
  birth_year: 1940,
  birth_order: 1,
  generation: 1,
  is_in_law: false,
};
const B: PersonNode = {
  id: "B",
  full_name: "Bà B",
  gender: "female",
  birth_year: 1942,
  birth_order: 1,
  generation: 1,
  is_in_law: false,
};
const C: PersonNode = {
  id: "C",
  full_name: "Con C",
  gender: "male",
  birth_year: 1965,
  birth_order: 1,
  generation: 2,
  is_in_law: false,
};
const D: PersonNode = {
  id: "D",
  full_name: "Con D",
  gender: "female",
  birth_year: 1968,
  birth_order: 2,
  generation: 2,
  is_in_law: false,
};
const E: PersonNode = {
  id: "E",
  full_name: "Vợ E",
  gender: "female",
  birth_year: 1967,
  birth_order: null,
  generation: 2,
  is_in_law: true,
};
const G: PersonNode = {
  id: "G",
  full_name: "Chồng G",
  gender: "male",
  birth_year: 1966,
  birth_order: null,
  generation: 2,
  is_in_law: true,
};
const F: PersonNode = {
  id: "F",
  full_name: "Cháu F",
  gender: "male",
  birth_year: 1990,
  birth_order: 1,
  generation: 3,
  is_in_law: false,
};
const H: PersonNode = {
  id: "H",
  full_name: "Cháu H",
  gender: "female",
  birth_year: 1992,
  birth_order: 1,
  generation: 3,
  is_in_law: false,
};

const persons: PersonNode[] = [A, B, C, D, E, G, F, H];

const rels: RelEdge[] = [
  // A-B marriage
  { type: "marriage", person_a: "A", person_b: "B" },
  // A & B parent of C
  { type: "biological_child", person_a: "A", person_b: "C" },
  { type: "biological_child", person_a: "B", person_b: "C" },
  // A & B parent of D
  { type: "biological_child", person_a: "A", person_b: "D" },
  { type: "biological_child", person_a: "B", person_b: "D" },
  // C-E marriage
  { type: "marriage", person_a: "C", person_b: "E" },
  // D-G marriage
  { type: "marriage", person_a: "D", person_b: "G" },
  // C & E parent of F
  { type: "biological_child", person_a: "C", person_b: "F" },
  { type: "biological_child", person_a: "E", person_b: "F" },
  // D & G parent of H
  { type: "biological_child", person_a: "D", person_b: "H" },
  { type: "biological_child", person_a: "G", person_b: "H" },
];

// ── computeEgoLabels: ego = C ─────────────────────────────────────────────────

describe("computeEgoLabels — ego = C", () => {
  const labels = computeEgoLabels("C", persons, rels);

  it("ego is NOT in its own map", () => {
    expect(labels.has("C")).toBe(false);
  });

  it('C calls E "Vợ"', () => {
    expect(labels.get("E")).toBe("Vợ");
  });

  it('C calls F "Con"', () => {
    expect(labels.get("F")).toBe("Con");
  });

  it('C calls A "Bố"', () => {
    expect(labels.get("A")).toBe("Bố");
  });

  it('C calls B "Mẹ"', () => {
    expect(labels.get("B")).toBe("Mẹ");
  });

  it("C calls D Em gái or Chị gái (D has higher birth_order → younger)", () => {
    // C birth_order=1, D birth_order=2 → C is senior → D is em gái
    const label = labels.get("D");
    expect(["Em gái", "Chị gái"]).toContain(label);
  });

  it("C calls D Em gái specifically (C is birth_order 1, D is birth_order 2)", () => {
    expect(labels.get("D")).toBe("Em gái");
  });

  it("G (chồng D) gets some label from C (a rể term)", () => {
    const label = labels.get("G");
    expect(label).toBeDefined();
    expect(typeof label).toBe("string");
  });

  it('C calls H "Cháu ngoại" (H\'s parent D is female)', () => {
    expect(labels.get("H")).toBe("Cháu ngoại");
  });
});

// ── computeEgoLabels: ego = A ─────────────────────────────────────────────────

describe("computeEgoLabels — ego = A", () => {
  const labels = computeEgoLabels("A", persons, rels);

  it("ego is NOT in its own map", () => {
    expect(labels.has("A")).toBe(false);
  });

  it('A calls B "Vợ"', () => {
    expect(labels.get("B")).toBe("Vợ");
  });

  it('A calls C "Con"', () => {
    expect(labels.get("C")).toBe("Con");
  });

  it('A calls D "Con"', () => {
    expect(labels.get("D")).toBe("Con");
  });

  it('A calls F "Cháu nội" (C is male → F is nội)', () => {
    expect(labels.get("F")).toBe("Cháu nội");
  });

  it('A calls H "Cháu ngoại" (D is female → H is ngoại)', () => {
    expect(labels.get("H")).toBe("Cháu ngoại");
  });
});

// ── computeEgoLabels: ego = F ─────────────────────────────────────────────────

describe("computeEgoLabels — ego = F", () => {
  const labels = computeEgoLabels("F", persons, rels);

  it('F calls A "Ông nội"', () => {
    expect(labels.get("A")).toBe("Ông nội");
  });

  it('F calls B "Bà nội"', () => {
    expect(labels.get("B")).toBe("Bà nội");
  });

  it('F calls C "Bố"', () => {
    expect(labels.get("C")).toBe("Bố");
  });

  it('F calls E "Mẹ"', () => {
    expect(labels.get("E")).toBe("Mẹ");
  });
});

// ── Regression: computeKinship public API unchanged ───────────────────────────

describe("computeKinship regression", () => {
  it('A calls C "Con"', () => {
    expect(computeKinship(A, C, persons, rels)?.aCallsB).toBe("Con");
  });

  it('C calls A "Bố"', () => {
    expect(computeKinship(C, A, persons, rels)?.aCallsB).toBe("Bố");
  });

  it('C calls E "Vợ"', () => {
    expect(computeKinship(C, E, persons, rels)?.aCallsB).toBe("Vợ");
  });

  it("returns null for same person", () => {
    expect(computeKinship(A, A, persons, rels)).toBeNull();
  });
});

// ── Edge: unrelated persons ───────────────────────────────────────────────────

describe("computeEgoLabels — no relationships", () => {
  const X: PersonNode = {
    id: "X",
    full_name: "X",
    gender: "male",
    birth_year: 1990,
    birth_order: 1,
    generation: 1,
    is_in_law: false,
  };
  const Y: PersonNode = {
    id: "Y",
    full_name: "Y",
    gender: "female",
    birth_year: 1992,
    birth_order: 1,
    generation: 1,
    is_in_law: false,
  };

  it("unrelated persons produce no label for Y", () => {
    const labels = computeEgoLabels("X", [X, Y], []);
    expect(labels.has("Y")).toBe(false);
  });

  it("returns an empty or minimal map (no crash)", () => {
    const labels = computeEgoLabels("X", [X, Y], []);
    // Either empty or Y not present
    expect(labels.get("Y")).toBeUndefined();
  });
});
