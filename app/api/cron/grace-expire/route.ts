import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonBody = Record<string, unknown>;

function safeJson(body: JsonBody, status = 200) {
  return NextResponse.json(body, { status });
}

function constantTimeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export async function GET() {
  return safeJson(
    { ok: false, code: "METHOD_NOT_ALLOWED", message: "POST only" },
    405
  );
}

export async function POST(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = req.headers.get("x-cron-secret") ?? "";

    if (!cronSecret) {
      return safeJson(
        { ok: false, code: "MISSING_CONFIG", message: "CRON_SECRET is not configured." },
        500
      );
    }

    if (!constantTimeEqual(headerSecret, cronSecret)) {
      return safeJson(
        { ok: false, code: "UNAUTHORIZED", message: "Invalid cron secret." },
        401
      );
    }

    const supabase = createAdminSupabaseClient();
    if (!supabase) {
      return safeJson(
        { ok: false, code: "MISSING_CONFIG", message: "Supabase admin env is not configured." },
        500
      );
    }

    const nowIso = new Date().toISOString();
    const { data: rows, error: queryError } = await supabase
      .from("profiles")
      .select("id")
      .eq("plan", "grace")
      .not("grace_ends_at", "is", null)
      .lt("grace_ends_at", nowIso);

    if (queryError) {
      return safeJson(
        { ok: false, code: "QUERY_FAILED", message: queryError.message },
        500
      );
    }

    const ids = (rows ?? []).map((row) => row.id).filter((id): id is string => typeof id === "string");
    if (ids.length === 0) {
      return safeJson({ ok: true, expired: 0 }, 200);
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        plan: "free",
        grace_started_at: null,
        grace_ends_at: null,
      })
      .in("id", ids);

    if (updateError) {
      return safeJson(
        { ok: false, code: "UPDATE_FAILED", message: updateError.message },
        500
      );
    }

    return safeJson({ ok: true, expired: ids.length }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return safeJson({ ok: false, code: "SERVER_ERROR", message }, 500);
  }
}
