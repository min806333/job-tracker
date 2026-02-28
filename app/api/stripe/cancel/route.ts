import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { userId?: string } | null;
  const userId = body?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  if (userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Missing Stripe configuration" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (error || !data?.stripe_subscription_id) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
  await stripe.subscriptions.update(data.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
