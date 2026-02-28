import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import DashboardClient from "./DashboardClient";

type SearchParams = {
  page?: string;
  limit?: string;
};

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
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("dashboard applications load failed", error);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("grace_ends_at")
    .eq("id", userData.user.id)
    .single();

  return (
    <DashboardClient
      userEmail={userData.user.email ?? ""}
      userId={userData.user.id}
      initialApplications={error ? [] : apps ?? []}
      page={page}
      limit={limit}
      totalCount={error ? 0 : count ?? 0}
      initialGraceEndsAt={profile?.grace_ends_at ?? null}
    />
  );
}
