import { getSupabase } from "@/utils/supabase/queries";
import { NextResponse } from "next/server";

/**
 * Public endpoint that checks whether at least one admin user exists.
 * Used by the login page to determine whether signup should be allowed.
 * - If no admin exists → first-time setup, allow signup
 * - If admin exists → signup is disabled, users must be created by admin
 */
export async function GET() {
  try {
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (error) {
      // If table doesn't exist yet (setup not done), treat as no admin
      if (error.code === "PGRST205" || error.code === "42P01") {
        return NextResponse.json({ adminExists: false, setupNeeded: true });
      }
      return NextResponse.json({ adminExists: false }, { status: 500 });
    }

    return NextResponse.json({ adminExists: (data?.length ?? 0) > 0 });
  } catch {
    return NextResponse.json({ adminExists: false }, { status: 500 });
  }
}
