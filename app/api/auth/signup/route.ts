import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonBody = Record<string, unknown>;

function json(status: number, body: JsonBody) {
  return NextResponse.json(body, { status });
}

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function isBlockedEmail(email: string) {
  const e = email.trim().toLowerCase();
  const [local] = e.split("@");

  if (local === "admin") return true;          // admin@gmail.com 차단
  if (e.startsWith("admin@")) return true;     // admin@anything 차단
  if (e.includes("+admin@")) return true;
  if (e.includes("administrator")) return true;

  return false;
}


function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function methodNotAllowed() {
  return json(405, { ok: false, message: "POST only" });
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json(415, { ok: false, message: "Content-Type must be application/json" });
    }

    let body: { email?: unknown; password?: unknown };
    try {
      body = (await req.json()) as { email?: unknown; password?: unknown };
    } catch {
      return json(400, { ok: false, message: "Invalid JSON body" });
    }

    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    const em = email.trim().toLowerCase();
    const pw = password;

    if (!em || !pw) return json(400, { ok: false, message: "email/password required" });
    if (!isValidEmail(em)) return json(400, { ok: false, message: "Invalid email format" });
    if (pw.length < 6) return json(400, { ok: false, message: "password too short" });
   if (isBlockedEmail(em)) {
  return NextResponse.json(
    { ok: false, message: "This email is not allowed." },
    { status: 403 }
  );
}

    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.auth.admin.createUser({
      email: em,
      password: pw,
      email_confirm: true,
    });

    if (error) {
      const message = error.message || "Sign-up failed";
      const lowered = message.toLowerCase();
      const status = lowered.includes("already") || lowered.includes("exists") ? 409 : 400;
      return json(status, { ok: false, message });
    }

    const userId = data.user?.id;
    if (!userId) return json(500, { ok: false, message: "User created but missing id" });

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        plan: "free",
        is_admin: false,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      return json(500, { ok: false, message: profileError.message || "Failed to initialize profile" });
    }

    return json(200, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(500, { ok: false, message });
  }
}

export async function GET() {
  return methodNotAllowed();
}

export async function PUT() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}
