import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";
import { isAdmin } from "../../../../../lib/auth/isAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Plan = "free" | "pro" | "grace";

function mapStatusToPlan(status: Stripe.Subscription.Status | null | undefined): Plan {
  if (status === "active" || status === "trialing") return "pro";
  if (status === "past_due" || status === "unpaid") return "grace";
  return "free";
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const admin = await isAdmin(supabase, user.id);
    if (!admin) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | { subscriptionId?: string; userId?: string }
      | null;
    const subscriptionId = body?.subscriptionId;
    const userId = body?.userId;

    if (!subscriptionId || !userId) {
      return NextResponse.json(
        { ok: false, code: "INVALID_INPUT", message: "subscriptionId와 userId가 필요합니다." },
        { status: 400 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { ok: false, code: "MISSING_CONFIG", message: "Stripe 설정이 누락되었습니다." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const expectedPlan = mapStatusToPlan(sub.status);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, code: "PROFILE_NOT_FOUND", message: "프로필을 찾지 못했습니다." },
        { status: 404 }
      );
    }

    const currentPlan = (profile?.plan as Plan | null) ?? "free";
    const matches = currentPlan === expectedPlan;

    return NextResponse.json(
      {
        ok: true,
        status: sub.status ?? null,
        expected_plan: expectedPlan,
        current_plan: currentPlan,
        matches,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/plan-check]", message);
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
