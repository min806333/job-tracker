import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { isAdmin } from "../../../../lib/auth/isAdmin";
import SubpageHeader from "../../../../components/dashboard/common/SubpageHeader";

type Ticket = {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "closed";
  requester_email: string | null;
  created_at: string;
};

function normalizeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function AdminSupportPage({
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

  let ticketsQuery = supabase
    .from("support_tickets")
    .select("id, subject, status, requester_email, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (query) {
    const safeQuery = query.replace(/%/g, "\\%").replace(/_/g, "\\_");
    ticketsQuery = ticketsQuery.or(
      `subject.ilike.%${safeQuery}%,requester_email.ilike.%${safeQuery}%`
    );
  }

  const { data, error } = await ticketsQuery;

  const tickets = (data ?? []) as Ticket[];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <SubpageHeader title="Support Admin" desc="Admin only: review and handle support tickets." />

        {error ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-red-300">
            Load failed: {error.message}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between">
          <div className="font-medium">All tickets</div>
            <div className="text-xs text-zinc-500">Showing up to 200 rows</div>
          </div>

          <form className="mt-3 flex flex-col gap-2 sm:flex-row" method="get">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search subject or requester_email"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200"
            />
            <button
              type="submit"
              className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-950/40"
            >
              Search
            </button>
          </form>

          {tickets.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-500">No tickets found.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Requester email</th>
                    <th className="py-2 pr-4">Created</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-200">
                  {tickets.map((t) => {
                    const email = t.requester_email ?? "(no email)";
                    return (
                      <tr key={t.id} className="border-t border-zinc-900/70">
                        <td className="py-2 pr-4 text-xs text-zinc-400">{t.status}</td>
                        <td className="py-2 pr-4">
                          <Link
                            href={`/admin/support/${t.id}`}
                            className="font-medium text-zinc-100 hover:text-emerald-300"
                          >
                            {t.subject}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">
                          <details className="max-w-xs">
                            <summary className="cursor-pointer list-none truncate text-zinc-300 [&::-webkit-details-marker]:hidden">
                              {email}
                            </summary>
                            <div className="mt-1 break-all text-xs text-zinc-400">{email}</div>
                          </details>
                        </td>
                        <td className="py-2 pr-4 text-xs text-zinc-400">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
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
