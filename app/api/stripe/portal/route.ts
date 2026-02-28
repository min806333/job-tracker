import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.headers.get("origin");

    if (!secretKey || !appUrl) {
      return NextResponse.json(
        { ok: false, code: "MISSING_CONFIG", message: "Stripe 설정이 누락되었습니다." },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (error || !data?.stripe_customer_id) {
      return NextResponse.json(
        { ok: false, code: "NO_CUSTOMER", message: "Stripe 고객 정보가 없습니다." },
        { status: 400 }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appUrl}/dashboard/plan`,
    });

    return NextResponse.json({ ok: true, url: session.url }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[stripe/portal]", message);
    return NextResponse.json(
      { ok: false, code: "STRIPE_ERROR", message },
      { status: 500 }
    );
  }
}
