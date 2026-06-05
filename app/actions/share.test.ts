/**
 * Security and logic tests for share.ts server actions.
 */

import { describe, expect, it, mock, beforeEach } from "bun:test";

// ── Types ─────────────────────────────────────────────────────────────────────

type InsertCall = {
  table: string;
  values: Record<string, unknown>;
};

type DeleteCall = {
  table: string;
  eq: { column: string; value: string };
};

// ── Shared mutable state for mock control ─────────────────────────────────────

const FAKE_USER_ID = "admin-user-id";
let insertCalls: InsertCall[] = [];
let deleteCalls: DeleteCall[] = [];
let queryRole: string | null = "admin"; // Can be changed in tests

// Mock next/cache
mock.module("next/cache", () => ({
  revalidatePath: () => {},
}));

// Mock queries
mock.module("@/utils/supabase/queries", () => ({
  getProfile: async () => {
    if (!queryRole) return null;
    return { id: FAKE_USER_ID, role: queryRole };
  },
  getSupabase: async () => ({
    from: (table: string) => ({
      insert: (values: Record<string, unknown>) => {
        insertCalls.push({ table, values });
        return Promise.resolve({ error: null });
      },
      select: () => ({
        order: () => {
          return Promise.resolve({
            data: [
              {
                token: "giapha-123456",
                expires_at: "2026-06-12T12:00:00Z",
                created_at: "2026-06-05T12:00:00Z",
                created_by: FAKE_USER_ID,
                settings: {},
              },
            ],
            error: null,
          });
        },
      }),
      delete: () => ({
        eq: (column: string, value: string) => {
          deleteCalls.push({ table, eq: { column, value } });
          return Promise.resolve({ error: null });
        },
      }),
    }),
  }),
}));

// Reset mock state
beforeEach(() => {
  insertCalls = [];
  deleteCalls = [];
  queryRole = "admin";
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Share Server Actions", () => {
  describe("createShareLink", () => {
    it("should reject non-admin and non-editor users", async () => {
      queryRole = "member"; // Member role
      const { createShareLink } = await import("./share");
      const result = await createShareLink(7);

      expect(result).toHaveProperty("error");
      expect(result.error).toContain("Từ chối truy cập");
      expect(insertCalls.length).toBe(0);
    });

    it("should accept admin users and insert share link with 7 days expiry", async () => {
      queryRole = "admin";
      const { createShareLink } = await import("./share");
      const result = await createShareLink(7, { view: "tree" });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("token");
      expect(result.token).toMatch(/^giapha-[a-z0-9]{6}$/);

      expect(insertCalls.length).toBe(1);
      expect(insertCalls[0].table).toBe("shared_links");
      expect(insertCalls[0].values).toMatchObject({
        token: result.token,
        created_by: FAKE_USER_ID,
        settings: { view: "tree" },
      });
      // Verify date is set correctly
      const expiresAt = new Date(insertCalls[0].values.expires_at as string);
      const differenceInMs = expiresAt.getTime() - Date.now();
      const differenceInDays = Math.round(differenceInMs / (1000 * 60 * 60 * 24));
      expect(differenceInDays).toBe(7);
    });

    it("should accept editor users and create share link", async () => {
      queryRole = "editor";
      const { createShareLink } = await import("./share");
      const result = await createShareLink(30);

      expect(result).toHaveProperty("success", true);
      expect(insertCalls.length).toBe(1);
    });
  });

  describe("getShareLinks", () => {
    it("should reject non-admin/editor users", async () => {
      queryRole = "member";
      const { getShareLinks } = await import("./share");
      const result = await getShareLinks();

      expect(result).toHaveProperty("error");
    });

    it("should return list of share links for admins", async () => {
      queryRole = "admin";
      const { getShareLinks } = await import("./share");
      const result = await getShareLinks();

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("links");
      // @ts-expect-error - expect result to contain links array
      expect(result.links.length).toBe(1);
      // @ts-expect-error - expect result to contain links array
      expect(result.links[0].token).toBe("giapha-123456");
    });
  });

  describe("deleteShareLink", () => {
    it("should reject non-admin/editor users", async () => {
      queryRole = "member";
      const { deleteShareLink } = await import("./share");
      const result = await deleteShareLink("giapha-123456");

      expect(result).toHaveProperty("error");
      expect(deleteCalls.length).toBe(0);
    });

    it("should delete share link if user is editor", async () => {
      queryRole = "editor";
      const { deleteShareLink } = await import("./share");
      const result = await deleteShareLink("giapha-123456");

      expect(result).toHaveProperty("success", true);
      expect(deleteCalls.length).toBe(1);
      expect(deleteCalls[0].table).toBe("shared_links");
      expect(deleteCalls[0].eq).toEqual({ column: "token", value: "giapha-123456" });
    });
  });
});
