import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const { data: apps, error } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="mt-4 text-red-300">불러오기 실패: {error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <DashboardClient
      userEmail={userData.user.email ?? ""}
      userId={userData.user.id}
      initialApplications={apps ?? []}
    />
  );
}
