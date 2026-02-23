import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  // ✅ Next 16: cookies()가 비동기인 경우가 많아서 await 처리
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },

        // ✅ Server Component 환경에서는 쿠키 set/remove가 제한될 수 있어서
        // try/catch로 "가능할 때만" 세팅 (Supabase 공식 패턴에서 자주 쓰는 방식)
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options } as any);
          } catch {
            // 서버 컴포넌트에서 set이 막히는 경우 무시
          }
        },

        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 } as any);
          } catch {
            // 서버 컴포넌트에서 remove가 막히는 경우 무시
          }
        },
      },
    }
  );
}
