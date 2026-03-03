import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import NewSupportTicketPageClient from "./NewSupportTicketPageClient";

export default async function NewSupportTicketPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <NewSupportTicketPageClient />;
}
