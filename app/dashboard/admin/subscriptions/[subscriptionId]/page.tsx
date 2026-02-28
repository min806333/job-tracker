import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";
import { isAdmin } from "../../../../../lib/auth/isAdmin";
import SubpageHeader from "../../../../../components/dashboard/common/SubpageHeader";

type SubscriptionRow = {
  user_id: string;
  status: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  price_id: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
  updated_at: string | null;
};

type WebhookLogRow = {
  created_at: string;
  severity: string;
  event_type: string;
  object_id: string | null;
  message: string;
};

export default async function AdminSubscriptionDetailPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>;
}) {
  const { subscriptionId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await isAdmin(supabase, user.id);
  if (!admin) redirect("/dashboard");

  const { data: subData, error: subError } = await supabase
    .from("subscriptions")
    .select(
      "user_id, status, stripe_subscription_id, stripe_customer_id, price_id, cancel_at_period_end, current_period_end, updated_at"
    )
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  const subscription = (subData ?? null) as SubscriptionRow | null;

  const { data: logsData, error: logsError } = await supabase
    .from("webhook_logs")
    .select("created_at, severity, event_type, object_id, message")
    .eq("object_id", subscriptionId)
    .order("created_at", { ascending: false })
    .limit(50);

  const logs = (logsData ?? []) as WebhookLogRow[];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <SubpageHeader
          title="Subscription Detail"
          desc="Admin only: review a single Stripe subscription and related webhooks."
        />

        <div className="mt-4">
          <Link href="/dashboard/admin/subscriptions" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← Back to subscriptions
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="font-medium">Subscription</div>
          {subError ? (
            <div className="mt-3 text-sm text-red-300">Load failed: {subError.message}</div>
          ) : !subscription ? (
            <div className="mt-3 text-sm text-zinc-500">No subscription found.</div>
          ) : (
            <div className="mt-4 grid gap-3 text-sm text-zinc-200">
              <div>
                <div className="text-xs text-zinc-500">User</div>
                <div>{subscription.user_id}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Status</div>
                <div>{subscription.status ?? "unknown"}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Stripe subscription ID</div>
                <div>{subscription.stripe_subscription_id ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Stripe customer ID</div>
                <div>{subscription.stripe_customer_id ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Price ID</div>
                <div>{subscription.price_id ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Cancel at period end</div>
                <div>
                  {subscription.cancel_at_period_end === null
                    ? "-"
                    : subscription.cancel_at_period_end
                    ? "true"
                    : "false"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Current period end</div>
                <div>
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleString()
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Updated at</div>
                <div>
                  {subscription.updated_at ? new Date(subscription.updated_at).toLocaleString() : "-"}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="font-medium">Webhook logs</div>
          {logsError ? (
            <div className="mt-3 text-sm text-red-300">Load failed: {logsError.message}</div>
          ) : logs.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-500">No webhook logs found.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr className="text-left">
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4">Severity</th>
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Message</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-200">
                  {logs.map((row) => (
                    <tr key={`${row.created_at}-${row.event_type}`}>
                      <td className="py-2 pr-4">{new Date(row.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{row.severity}</td>
                      <td className="py-2 pr-4">{row.event_type}</td>
                      <td className="py-2 pr-4 text-xs text-zinc-400">{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
