import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PlanClient from "./PlanClient";

export default async function PlanPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: initialApplications } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <PlanClient
      userId={user.id}
      userEmail={user.email ?? ""}
      initialApplications={initialApplications ?? []}
    />
  );
}