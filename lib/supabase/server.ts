import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  // Next 16: cookies() can be async in some contexts.
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },

        // In server components, set/remove can throw if cookies are immutable.
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options } as any);
          } catch {
            // Ignore when cookies are read-only.
          }
        },

        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 } as any);
          } catch {
            // Ignore when cookies are read-only.
          }
        },
      },
    }
  );
}
