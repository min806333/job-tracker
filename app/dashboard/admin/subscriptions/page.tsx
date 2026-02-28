import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { isAdmin } from "../../../../lib/auth/isAdmin";
import SubpageHeader from "../../../../components/dashboard/common/SubpageHeader";
import PlanMismatchClient from "./PlanMismatchClient";

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

function normalizeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await isAdmin(supabase, user.id);
  if (!admin) redirect("/dashboard");

  const statusFilter = normalizeParam(resolvedSearchParams?.status) ?? "all";
  const query = (normalizeParam(resolvedSearchParams?.q) ?? "").trim();

  let subsQuery = supabase
    .from("subscriptions")
    .select(
      "user_id, status, stripe_subscription_id, stripe_customer_id, price_id, cancel_at_period_end, current_period_end, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (statusFilter !== "all") {
    subsQuery = subsQuery.eq("status", statusFilter);
  }

  if (query) {
    const safeQuery = query.replace(/%/g, "\\%");
    subsQuery = subsQuery.or(
      `user_id.ilike.%${safeQuery}%,stripe_subscription_id.ilike.%${safeQuery}%`
    );
  }

  const { data: subsData, error: subsError } = await subsQuery;
  const subscriptions = (subsData ?? []) as SubscriptionRow[];

  const userIds = Array.from(new Set(subscriptions.map((row) => row.user_id)));
  let planByUser: Record<string, "free" | "pro" | "grace"> = {};
  if (userIds.length > 0) {
    const { data: planRows } = await supabase
      .from("profiles")
      .select("id, plan")
      .in("id", userIds);

    for (const row of planRows ?? []) {
      const plan = row?.plan === "pro" ? "pro" : row?.plan === "grace" ? "grace" : "free";
      if (row?.id) planByUser[row.id] = plan;
    }
  }

  const statusCounts = subscriptions.reduce<Record<string, number>>((acc, row) => {
    const key = row.status ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const logsQuery = supabase
    .from("webhook_logs")
    .select("created_at, severity, event_type, object_id, message")
    .in("severity", ["warn", "error"])
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: logsData, error: logsError } = await logsQuery;
  const logs = (logsData ?? []) as WebhookLogRow[];

  const statusOptions = ["all", "active", "trialing", "past_due", "canceled", "unpaid", "incomplete"];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <SubpageHeader
          title="Subscription Monitoring"
          desc="Admin only: review subscription health and recent Stripe webhooks."
        />

        <form className="mt-6 grid gap-3 md:grid-cols-3" method="get">
          <input
            name="q"
            placeholder="Search user_id or subscription_id"
            defaultValue={query}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200"
          />
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                Status: {status}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-950/40"
          >
            Apply filters
          </button>
        </form>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Object.keys(statusCounts).length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-500">
              No subscriptions found for current filters.
            </div>
          ) : (
            Object.entries(statusCounts).map(([status, count]) => (
              <div
                key={status}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <div className="text-xs text-zinc-500">Status</div>
                <div className="mt-1 text-lg font-semibold text-zinc-100">{status}</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-200">{count}</div>
              </div>
            ))
          )}
        </div>

        <PlanMismatchClient
          rows={subscriptions
            .filter((row) => row.stripe_subscription_id)
            .map((row) => ({
              userId: row.user_id,
              subscriptionId: row.stripe_subscription_id as string,
              currentPlan: planByUser[row.user_id] ?? "free",
            }))}
        />

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">Subscriptions</div>
            <div className="text-xs text-zinc-500">Showing up to 200 rows</div>
          </div>

          {subsError ? (
            <div className="mt-3 text-sm text-red-300">Load failed: {subsError.message}</div>
          ) : subscriptions.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-500">No subscriptions to display.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr className="text-left">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Subscription</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4">Price</th>
                    <th className="py-2 pr-4">Cancel at period end</th>
                    <th className="py-2 pr-4">Current period end</th>
                    <th className="py-2 pr-4">Updated</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-200">
                  {subscriptions.map((row) => (
                    <tr key={`${row.user_id}-${row.stripe_subscription_id ?? "none"}`}>
                      <td className="py-2 pr-4">
                        <div className="text-xs text-zinc-500">{row.user_id}</div>
                      </td>
                      <td className="py-2 pr-4">{row.status ?? "unknown"}</td>
                      <td className="py-2 pr-4">
                        {row.stripe_subscription_id ? (
                          <Link
                            href={`/dashboard/admin/subscriptions/${row.stripe_subscription_id}`}
                            className="text-emerald-300 hover:text-emerald-200"
                          >
                            {row.stripe_subscription_id}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 pr-4">{row.stripe_customer_id ?? "-"}</td>
                      <td className="py-2 pr-4">{row.price_id ?? "-"}</td>
                      <td className="py-2 pr-4">
                        {row.cancel_at_period_end === null
                          ? "-"
                          : row.cancel_at_period_end
                          ? "true"
                          : "false"}
                      </td>
                      <td className="py-2 pr-4">
                        {row.current_period_end
                          ? new Date(row.current_period_end).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-2 pr-4">
                        {row.updated_at ? new Date(row.updated_at).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">Recent Webhook Logs</div>
            <div className="text-xs text-zinc-500">Last 50 events</div>
          </div>

          {logsError ? (
            <div className="mt-3 text-sm text-red-300">Load failed: {logsError.message}</div>
          ) : logs.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-500">No webhook logs yet.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr className="text-left">
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Object</th>
                    <th className="py-2 pr-4">Severity</th>
                    <th className="py-2 pr-4">Message</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-200">
                  {logs.map((row) => (
                    <tr key={`${row.created_at}-${row.event_type}-${row.object_id ?? "none"}`}>
                      <td className="py-2 pr-4">{new Date(row.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{row.event_type}</td>
                      <td className="py-2 pr-4">{row.object_id ?? "-"}</td>
                      <td className="py-2 pr-4">{row.severity}</td>
                      <td className="py-2 pr-4 text-xs text-zinc-400">{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-zinc-500">
          * Admin access requires profiles.is_admin=true.
        </div>
      </div>
    </main>
  );
}
