import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorBody = { ok: false; error: string };
type SuccessBody = { ok: true };

const EVENT_NAME_REGEX = /^[a-z0-9_]+$/;
const EVENT_NAME_MIN_LENGTH = 1;
const EVENT_NAME_MAX_LENGTH = 64;

type Source = "client" | "server";

type LogEventBody = {
  event_name?: unknown;
  context?: unknown;
  source?: unknown;
};

function jsonError(status: number, error: string) {
  return NextResponse.json<ErrorBody>({ ok: false, error }, { status });
}

function jsonOk() {
  return NextResponse.json<SuccessBody>({ ok: true }, { status: 200 });
}

function normalizeContext(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function parseSource(value: unknown): Source | null {
  if (value === undefined) return "client";
  if (value === "client" || value === "server") return value;
  return null;
}

function parseEventName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (
    normalized.length < EVENT_NAME_MIN_LENGTH ||
    normalized.length > EVENT_NAME_MAX_LENGTH ||
    !EVENT_NAME_REGEX.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export async function POST(req: Request) {
  let body: LogEventBody;
  try {
    body = (await req.json()) as LogEventBody;
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const eventName = parseEventName(body.event_name);
  if (!eventName) {
    return jsonError(400, "event_name must be 1~64 chars and match ^[a-z0-9_]+$");
  }

  // TODO: Restrict event_name with a server-side allowlist for stronger abuse prevention.
  const source = parseSource(body.source);
  if (!source) {
    return jsonError(400, "source must be 'client' or 'server'");
  }

  const context = normalizeContext(body.context);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError(401, "Unauthorized");
  }

  const { error } = await supabase.rpc("log_product_event", {
    p_event_name: eventName,
    p_context: context,
    p_source: source,
  });

  if (error) {
    return jsonError(500, "Failed to log event");
  }

  return jsonOk();
}
