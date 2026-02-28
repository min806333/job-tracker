import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";
import { isAdmin } from "../../../../../lib/auth/isAdmin";
import AdminSupportDetailClient from "./AdminSupportDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminSupportDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await isAdmin(supabase, user.id);
  if (!admin) redirect("/dashboard");

  return <AdminSupportDetailClient id={id} />;
}
