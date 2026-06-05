/**
 * Security invariant tests for user.ts server actions.
 *
 * Goal: prove that self-actions (linkMyPerson, updateMyAvatar) never accept a
 * userId param (no cross-user writes possible), and that the admin-only action
 * (adminSetUserPerson) always routes through the RPC that enforces admin check
 * and surfaces errors — including Access denied — to the caller.
 */

import { describe, expect, it, mock, beforeEach } from "bun:test";

// ── Types ─────────────────────────────────────────────────────────────────────

type RpcCall = { name: string; params: Record<string, unknown> };
type UpdateCall = {
  table: string;
  values: Record<string, unknown>;
  eq: { column: string; value: string };
};

// ── Shared mutable state for mock control ─────────────────────────────────────

const FAKE_USER_ID = "user-aaa-111";
let rpcCalls: RpcCall[] = [];
let updateCalls: UpdateCall[] = [];
let rpcError: { message: string } | null = null;

// Mock next/cache so revalidatePath doesn't require a Next.js static context.
mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

// Bun requires mock.module at module scope (hoisted before imports).
// We use mutable shared state so individual tests can control return values.
mock.module("@/utils/supabase/queries", () => ({
  getSupabase: async () => ({
    rpc: (name: string, params: Record<string, unknown>) => {
      rpcCalls.push({ name, params });
      return Promise.resolve({ error: rpcError });
    },
    from: (table: string) => ({
      update: (values: Record<string, unknown>) => ({
        eq: (column: string, value: string) => {
          updateCalls.push({ table, values, eq: { column, value } });
          return Promise.resolve({ error: null });
        },
      }),
    }),
  }),
  getUser: async () => ({ id: FAKE_USER_ID, email: "test@example.com" }),
  getProfile: async () => null,
  getIsAdmin: async () => false,
}));

// Reset state before each test
beforeEach(() => {
  rpcCalls = [];
  updateCalls = [];
  rpcError = null;
});

// ── 1. Function arity invariants ──────────────────────────────────────────────
// Prove that self-actions do not accept a userId parameter.

describe("Server action arity invariants", () => {
  it("linkMyPerson accepts exactly 1 param (personId, no userId)", async () => {
    const { linkMyPerson } = await import("./user");
    expect(linkMyPerson.length).toBe(1);
  });

  it("updateMyAvatar accepts exactly 1 param (avatarUrl, no userId)", async () => {
    const { updateMyAvatar } = await import("./user");
    expect(updateMyAvatar.length).toBe(1);
  });

  it("adminSetUserPerson accepts exactly 2 params (userId, personId)", async () => {
    const { adminSetUserPerson } = await import("./user");
    expect(adminSetUserPerson.length).toBe(2);
  });
});

// ── 2. linkMyPerson — RPC routing ─────────────────────────────────────────────

describe("linkMyPerson — RPC routing", () => {
  it("calls rpc set_my_person with target_person_id only, no userId field", async () => {
    const { linkMyPerson } = await import("./user");
    await linkMyPerson("person-bbb-222");

    const call = rpcCalls.find((c) => c.name === "set_my_person");
    expect(call).toBeDefined();
    expect(call?.params).toEqual({ target_person_id: "person-bbb-222" });
    // No userId in params — cross-user writes impossible via this action
    expect(Object.keys(call?.params ?? {})).not.toContain("user_id");
    expect(Object.keys(call?.params ?? {})).not.toContain("target_user_id");
  });

  it("calls set_my_person with target_person_id=null to unlink", async () => {
    const { linkMyPerson } = await import("./user");
    await linkMyPerson(null);

    const call = rpcCalls.find((c) => c.name === "set_my_person");
    expect(call).toBeDefined();
    expect(call?.params).toEqual({ target_person_id: null });
  });

  it("returns success when RPC succeeds", async () => {
    const { linkMyPerson } = await import("./user");
    const result = await linkMyPerson("person-bbb-222");
    expect(result).toEqual({ success: true });
  });
});

// ── 3. updateMyAvatar — own-row write only ────────────────────────────────────

describe("updateMyAvatar — own-row write only", () => {
  it("calls profiles.update filtered by getUser().id, not a passed-in userId", async () => {
    const { updateMyAvatar } = await import("./user");
    await updateMyAvatar("https://example.com/avatar.jpg");

    const call = updateCalls.find((c) => c.table === "profiles");
    expect(call).toBeDefined();
    // eq filter must use the uid from getUser(), never a param
    expect(call?.eq).toEqual({ column: "id", value: FAKE_USER_ID });
    expect(call?.values).toMatchObject({ avatar_url: "https://example.com/avatar.jpg" });
  });

  it("supports null to clear avatar (avatar_url = null)", async () => {
    const { updateMyAvatar } = await import("./user");
    await updateMyAvatar(null);

    const call = updateCalls.find((c) => c.table === "profiles");
    expect(call?.values).toMatchObject({ avatar_url: null });
    expect(call?.eq.value).toBe(FAKE_USER_ID);
  });
});

// ── 4. adminSetUserPerson — admin RPC routing ─────────────────────────────────

describe("adminSetUserPerson — admin RPC routing", () => {
  it("calls rpc admin_set_user_person with both target_user_id and target_person_id", async () => {
    const { adminSetUserPerson } = await import("./user");
    await adminSetUserPerson("user-bbb-222", "person-ccc-333");

    const call = rpcCalls.find((c) => c.name === "admin_set_user_person");
    expect(call).toBeDefined();
    expect(call?.params).toEqual({
      target_user_id: "user-bbb-222",
      target_person_id: "person-ccc-333",
    });
  });

  it("surfaces Access denied error when RPC rejects non-admin call", async () => {
    rpcError = { message: "Access denied." };
    const { adminSetUserPerson } = await import("./user");
    const result = await adminSetUserPerson("user-bbb-222", "person-ccc-333");

    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("Access denied");
  });

  it("accepts null personId to unlink a user from their person", async () => {
    const { adminSetUserPerson } = await import("./user");
    await adminSetUserPerson("user-bbb-222", null);

    const call = rpcCalls.find((c) => c.name === "admin_set_user_person");
    expect(call?.params).toEqual({
      target_user_id: "user-bbb-222",
      target_person_id: null,
    });
  });

  it("returns success on successful admin assignment", async () => {
    const { adminSetUserPerson } = await import("./user");
    const result = await adminSetUserPerson("user-bbb-222", "person-ccc-333");
    expect(result).toEqual({ success: true });
  });
});

// ── 5. updateMyEmail — RPC routing, no userId param ──────────────────────────

describe("updateMyEmail — RPC routing", () => {
  it("accepts exactly 1 param (newEmail, no userId)", async () => {
    const { updateMyEmail } = await import("./user");
    expect(updateMyEmail.length).toBe(1);
  });

  it("calls rpc update_my_email with new_email only, no userId field", async () => {
    const { updateMyEmail } = await import("./user");
    await updateMyEmail("new@example.com");

    const call = rpcCalls.find((c) => c.name === "update_my_email");
    expect(call).toBeDefined();
    expect(call?.params).toEqual({ new_email: "new@example.com" });
    expect(Object.keys(call?.params ?? {})).not.toContain("user_id");
    expect(Object.keys(call?.params ?? {})).not.toContain("target_user_id");
  });

  it("returns error when RPC fails", async () => {
    rpcError = { message: "Email already in use." };
    const { updateMyEmail } = await import("./user");
    const result = await updateMyEmail("taken@example.com");
    expect(result).toHaveProperty("error");
  });
});
