import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { isAdmin } from "../../../../lib/auth/isAdmin";
import SubpageHeader from "../../../../components/dashboard/common/SubpageHeader";

type Ticket = {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "closed";
  user_email: string | null;
  created_at: string;
};

export default async function AdminSupportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await isAdmin(supabase, user.id);
  if (!admin) redirect("/dashboard");

  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, subject, status, user_email, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

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
          </div>

          {tickets.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-500">No tickets found.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {tickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/admin/support/${t.id}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 hover:bg-zinc-900/40 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-zinc-100 truncate">{t.subject}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {t.user_email ?? "(no email)"} - {new Date(t.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 shrink-0">{t.status}</div>
                  </div>
                </Link>
              ))}
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
