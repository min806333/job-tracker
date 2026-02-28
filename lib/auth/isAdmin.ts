import type { SupabaseClient } from "@supabase/supabase-js";

export async function isAdmin(supabase: SupabaseClient, userId?: string | null) {
  let uid = userId ?? null;

  if (!uid) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    uid = user?.id ?? null;
  }

  if (!uid) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", uid)
    .single();

  if (error) return false;

  return !!data?.is_admin;
}
