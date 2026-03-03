import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { isAdmin } from "../../../lib/auth/isAdmin";
import AdminPortalButton from "../../../components/admin/AdminPortalButton";

type ProfileRow = {
  id: string;
  plan: "free" | "pro" | "grace" | null;
  stripe_customer_id: string | null;
  is_admin: boolean;
};

type SubscriptionRow = {
  user_id: string;
  status: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
  updated_at: string | null;
};

type EventRow = {
  user_id: string;
  event_name: string;
  ts: string;
  source: string;
  context: unknown;
};

type AuthUserRow = {
  id: string;
  email: string | null;
};

function normalizeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function shortId(id: string) {
  return `${id.slice(0, 8)}...`;
}

function summarizeContext(context: unknown) {
  if (!context) return "-";
  try {
    const text = JSON.stringify(context);
    return text.length > 140 ? `${text.slice(0, 137)}...` : text;
  } catch {
    return "-";
  }
}

export default async function AdminSubscriptionsMonitorPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = normalizeParam(params?.q);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await isAdmin(supabase, user.id);
  if (!admin) redirect("/dashboard");

  const adminClient = createSupabaseAdminClient();

  let subscriptions: SubscriptionRow[] = [];
  let profiles: ProfileRow[] = [];
  let authUsers: AuthUserRow[] = [];
  let events: EventRow[] = [];

  const userIds = new Set<string>();

  if (query) {
    const safeQuery = query.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const { data: subRows } = await adminClient
      .from("subscriptions")
      .select(
        "user_id, status, stripe_subscription_id, stripe_customer_id, cancel_at_period_end, current_period_end, updated_at"
      )
      .or(
        `user_id.ilike.%${safeQuery}%,stripe_customer_id.ilike.%${safeQuery}%,stripe_subscription_id.ilike.%${safeQuery}%`
      )
      .order("updated_at", { ascending: false })
      .limit(100);
    subscriptions = (subRows ?? []) as SubscriptionRow[];
    for (const row of subscriptions) userIds.add(row.user_id);

    const { data: emailRows } = await adminClient
      .schema("auth")
      .from("users")
      .select("id, email")
      .ilike("email", `%${safeQuery}%`)
      .limit(50);
    authUsers = (emailRows ?? []) as AuthUserRow[];
    for (const row of authUsers) userIds.add(row.id);
  } else {
    const { data: subRows } = await adminClient
      .from("subscriptions")
      .select(
        "user_id, status, stripe_subscription_id, stripe_customer_id, cancel_at_period_end, current_period_end, updated_at"
      )
      .order("updated_at", { ascending: false })
      .limit(50);
    subscriptions = (subRows ?? []) as SubscriptionRow[];
    for (const row of subscriptions) userIds.add(row.user_id);
  }

  const ids = Array.from(userIds);

  if (ids.length > 0) {
    const { data: profileRows } = await adminClient
      .from("profiles")
      .select("id, plan, stripe_customer_id, is_admin")
      .in("id", ids);
    profiles = (profileRows ?? []) as ProfileRow[];

    if (authUsers.length === 0) {
      const { data: authRows } = await adminClient
        .schema("auth")
        .from("users")
        .select("id, email")
        .in("id", ids);
      authUsers = (authRows ?? []) as AuthUserRow[];
    }

    const { data: eventRows } = await adminClient
      .from("product_events")
      .select("user_id, event_name, ts, source, context")
      .in("user_id", ids)
      .order("ts", { ascending: false })
      .limit(50);
    events = (eventRows ?? []) as EventRow[];
  }

  const profileById = new Map(profiles.map((row) => [row.id, row]));
  const emailById = new Map(authUsers.map((row) => [row.id, row.email]));
  const latestSubscriptionByUser = new Map<string, SubscriptionRow>();
  for (const row of subscriptions) {
    if (!latestSubscriptionByUser.has(row.user_id)) {
      latestSubscriptionByUser.set(row.user_id, row);
    }
  }

  const cardUserIds =
    ids.length > 0
      ? ids
      : Array.from(new Set(subscriptions.map((row) => row.user_id)));

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Admin Subscription Monitoring</h1>
          <p className="text-sm text-zinc-400">
            Search by user ID or email, inspect subscription state, and review product event timeline.
          </p>
        </div>

        <form className="mt-6 flex flex-col gap-3 sm:flex-row" method="get">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search email or user_id"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200"
          />
          <button
            type="submit"
            className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-950/40"
          >
            Search
          </button>
        </form>

        <section className="mt-8">
          <div className="mb-3 text-sm text-zinc-400">Result Cards</div>
          {cardUserIds.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-500">
              No users found.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {cardUserIds.map((uid) => {
                const profile = profileById.get(uid);
                const sub = latestSubscriptionByUser.get(uid);
                const email = emailById.get(uid);
                const periodEnd = sub?.current_period_end;
                return (
                  <div key={uid} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-zinc-500">User</div>
                        <div className="text-sm text-zinc-100">{uid}</div>
                        <div className="text-xs text-zinc-400">{email ?? "-"}</div>
                      </div>
                      <AdminPortalButton
                        userId={uid}
                        customerId={sub?.stripe_customer_id ?? profile?.stripe_customer_id ?? null}
                      />
                    </div>

                    <div className="mt-4 grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">profiles.plan</span>
                        <span className="font-medium">{profile?.plan ?? "free"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">stripe_customer_id</span>
                        <span className="font-mono text-xs">
                          {sub?.stripe_customer_id ?? profile?.stripe_customer_id ?? "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">stripe_subscription_id</span>
                        <span className="font-mono text-xs">{sub?.stripe_subscription_id ?? "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">stripe status</span>
                        <span>{sub?.status ?? "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">current_period_end</span>
                        <span className="text-xs">
                          {periodEnd ? new Date(periodEnd).toLocaleString() : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">cancel_at_period_end</span>
                        <span>{sub?.cancel_at_period_end === null ? "-" : String(sub?.cancel_at_period_end)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-medium">Product Events Timeline</div>
            <div className="text-xs text-zinc-500">Recent 50</div>
          </div>

          {events.length === 0 ? (
            <div className="text-sm text-zinc-500">No product events found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr className="text-left">
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Context</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-200">
                  {events.map((event, idx) => (
                    <tr key={`${event.user_id}-${event.ts}-${idx}`} className="border-t border-zinc-900/70">
                      <td className="py-2 pr-4 text-xs">{new Date(event.ts).toLocaleString()}</td>
                      <td className="py-2 pr-4 text-xs">
                        {shortId(event.user_id)}
                        <div className="text-[11px] text-zinc-500">{emailById.get(event.user_id) ?? "-"}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <div>{event.event_name}</div>
                        <div className="text-[11px] text-zinc-500">{event.source}</div>
                      </td>
                      <td className="py-2 pr-4 text-xs text-zinc-400">{summarizeContext(event.context)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
