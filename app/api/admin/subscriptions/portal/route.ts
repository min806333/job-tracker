import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../../../lib/supabase/admin";
import { isAdmin } from "../../../../../lib/auth/isAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  userId?: unknown;
  customerId?: unknown;
};

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const admin = await isAdmin(supabase, user.id);
    if (!admin) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const userId = typeof body.userId === "string" ? body.userId : "";
    let customerId = typeof body.customerId === "string" ? body.customerId : "";

    if (!customerId) {
      if (!userId) {
        return NextResponse.json(
          { ok: false, message: "userId or customerId is required" },
          { status: 400 }
        );
      }

      const adminClient = createSupabaseAdminClient();
      const { data: profile, error } = await adminClient
        .from("profiles")
        .select("stripe_customer_id, is_admin")
        .eq("id", userId)
        .single();

      if (error || !profile?.stripe_customer_id) {
        return NextResponse.json(
          { ok: false, message: "No stripe customer for this user" },
          { status: 404 }
        );
      }
      customerId = profile.stripe_customer_id;
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.headers.get("origin");
    if (!secretKey || !appUrl) {
      return NextResponse.json(
        { ok: false, message: "Missing Stripe configuration" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/admin/subscriptions`,
    });

    return NextResponse.json({ ok: true, url: session.url }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin/subscriptions/portal]", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
