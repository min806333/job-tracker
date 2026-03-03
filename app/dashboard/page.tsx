import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import DashboardClient from "./DashboardClient";

type SearchParams = {
  page?: string;
  limit?: string;
};

function isConservativeSampleApplication(app: { company: string | null; role: string | null }) {
  return (app.company ?? "").includes("(샘플)") || (app.role ?? "").includes("(샘플)");
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const page = Math.max(1, Number(resolvedSearchParams?.page ?? "1") || 1);
  const limitRaw = Number(resolvedSearchParams?.limit ?? "200") || 200;
  const limit = Math.min(500, Math.max(20, limitRaw));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: apps, error, count } = await supabase
    .from("applications")
    .select("id, user_id, company, role, url, stage, deadline_at, created_at, position, next_action, followup_at, source", {
      count: "exact",
    })
    .not("company", "ilike", "%(샘플)%")
    .not("role", "ilike", "%(샘플)%")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("dashboard applications load failed", error);
  }

  const { data: profile } = await supabase
    .from("profiles")
    // TODO: if schema uses `grace_end_at`, migrate and align this selector.
    .select("plan, grace_ends_at, is_admin")
    .eq("id", userData.user.id)
    .single();

  const filteredApps = (error ? [] : apps ?? []).filter((app) => !isConservativeSampleApplication(app));

  return (
    <DashboardClient
      userEmail={userData.user.email ?? ""}
      userId={userData.user.id}
      initialApplications={filteredApps}
      page={page}
      limit={limit}
      totalCount={error ? 0 : Math.max(0, count ?? filteredApps.length)}
      initialGraceEndsAt={profile?.grace_ends_at ?? null}
      initialPlan={
        profile?.plan === "pro" ? "pro" : profile?.plan === "grace" ? "grace" : "free"
      }
      initialIsAdmin={profile?.is_admin === true}
    />
  );
}
