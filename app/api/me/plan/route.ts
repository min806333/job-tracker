import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    if (url.searchParams.get("log") === "timeout") {
      console.warn(`[plan-sync] timeout: user=${user.id}`);
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("plan, updated_at")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_FOUND",
          message: "\uD50C\uB79C \uC815\uBCF4\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        plan: data.plan ?? "free",
        updated_at: data.updated_at ?? null,
        source: "profiles",
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api/me/plan]", message);
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
