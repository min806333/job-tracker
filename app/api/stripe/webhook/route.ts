import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function methodNotAllowed() {
  return NextResponse.json(
    { ok: false, code: "METHOD_NOT_ALLOWED", message: "POST only" },
    { status: 405, headers: { Allow: "POST" } }
  );
}

type SubscriptionUpsert = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  updated_at: string;
};

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

async function getUserIdBySubscriptionId(
  supabase: any,
  subscriptionId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  const row = data as { user_id?: string } | null;
  return row?.user_id ?? null;
}

async function upsertSubscription(
  supabase: any,
  sub: Stripe.Subscription,
  userId: string,
  syncPlan: boolean
) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  const row: SubscriptionUpsert = {
    user_id: userId,
    stripe_customer_id: customerId ?? null,
    stripe_subscription_id: sub.id ?? null,
    status: sub.status ?? null,
    price_id: priceId,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: sub.cancel_at_period_end ?? null,
    updated_at: new Date().toISOString(),
  };

  await supabase.from("subscriptions").upsert(row, {
    onConflict: "stripe_subscription_id",
  });

  if (syncPlan) {
    const plan =
      sub.status === "active" || sub.status === "trialing"
        ? "pro"
        : sub.status === "past_due" || sub.status === "unpaid"
        ? "grace"
        : "free";
    const profileUpdate = {
      plan,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: sub.id ?? null,
    };

    const { error } = await supabase.from("profiles").update(profileUpdate).eq("id", userId);
    if (error) {
      await supabase.from("profiles").update({ plan }).eq("id", userId);
    }
  }
}

async function insertIdempotencyLog(
  supabase: any,
  event: Stripe.Event,
  objectId: string | null
): Promise<boolean> {
  const message = `received event=${event.id} type=${event.type} object=${objectId ?? "none"}`;
  try {
    const { data, error } = await supabase
      .from("webhook_logs")
      .upsert(
        {
          event_id: event.id,
          event_type: event.type,
          object_id: objectId ?? null,
          severity: "info",
          message,
          created_at: new Date().toISOString(),
        },
        { onConflict: "event_id", ignoreDuplicates: true }
      )
      .select("event_id");
    if (error) throw error;
    if (Array.isArray(data)) {
      return data.length > 0;
    }
    return !!data;
  } catch {
    return true;
  }
}

async function updateWebhookLog(
  supabase: any,
  event: Stripe.Event,
  objectId: string | null,
  severity: "warn" | "error",
  message: string
): Promise<void> {
  try {
    await supabase
      .from("webhook_logs")
      .update({
        event_type: event.type,
        object_id: objectId ?? null,
        severity,
        message,
      })
      .eq("event_id", event.id);
  } catch {
    return;
  }
}

function getEventObjectId(event: Stripe.Event): string | null {
  const obj = event.data.object as { id?: string } | null;
  return obj?.id ?? null;
}

async function markPastDueSeen(
  supabase: any,
  subscriptionId: string
): Promise<void> {
  try {
    await supabase
      .from("subscriptions")
      .update({ past_due_seen_at: new Date().toISOString() })
      .eq("stripe_subscription_id", subscriptionId);
  } catch {
    return;
  }
}

export async function POST(req: Request) {
  const secretKey = getEnv("STRIPE_SECRET_KEY");
  const webhookSecret = getEnv("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const objectId = getEventObjectId(event);
  const inserted = await insertIdempotencyLog(supabase, event, objectId);
  if (!inserted) {
    return NextResponse.json({ ok: true });
  }

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (await getUserIdBySubscriptionId(supabase, sub.id)) ?? null;
      if (!userId) {
        const message = `No user match for subscription. event=${event.id} type=${event.type} object=${sub.id}`;
        console.warn(`[stripe-webhook] WARN: ${message}`);
        await updateWebhookLog(supabase, event, sub.id ?? null, "warn", message);
        return NextResponse.json({ ok: true });
      }
      await upsertSubscription(supabase, sub, userId, true);
      return NextResponse.json({ ok: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      if (!userId) {
        const message = `Missing session.metadata.user_id. event=${event.id} type=${event.type} object=${session.id}`;
        console.error(`[stripe-webhook] ERROR: ${message}`);
        await updateWebhookLog(supabase, event, session.id ?? null, "error", message);
        return NextResponse.json({ ok: true });
      }
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        await upsertSubscription(supabase, sub, userId, true);
      }
      return NextResponse.json({ ok: true });
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = (await getUserIdBySubscriptionId(supabase, sub.id)) ?? null;
        if (userId) {
          await upsertSubscription(supabase, sub, userId, true);
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = (await getUserIdBySubscriptionId(supabase, sub.id)) ?? null;
        if (userId) {
          await upsertSubscription(supabase, sub, userId, false);
        }
        await markPastDueSeen(supabase, subId);
        console.warn(
          `[stripe-webhook] WARN: Invoice payment failed. event=${event.id} type=${event.type} object=${subId}`
        );
      }
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[stripe-webhook] ERROR: Handler failure. event=${event.id} type=${event.type} object=${objectId ?? "none"} msg=${message}`
    );
    await updateWebhookLog(
      supabase,
      event,
      objectId,
      "error",
      `Handler failure. event=${event.id} type=${event.type} object=${objectId ?? "none"}`
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
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

export async function OPTIONS() {
  return methodNotAllowed();
}
