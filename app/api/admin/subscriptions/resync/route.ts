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
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

    const { error } = await supabase
      .from("profiles")
      .update({
        plan: expectedPlan,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id ?? null,
      })
      .eq("id", userId);

    if (error) {
      return NextResponse.json(
        { ok: false, code: "UPDATE_FAILED", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: sub.status ?? null,
        plan: expectedPlan,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/plan-resync]", message);
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
