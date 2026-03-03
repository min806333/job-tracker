"use client";

import { Suspense, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { useRouter, useSearchParams } from "next/navigation";

function mapLoginError(message?: string) {
  const normalized = (message ?? "").toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호를 확인해 주세요.";
  }
  if (normalized.includes("email not confirmed")) {
    return "이메일 인증이 필요해요. 메일함에서 인증 링크를 확인해 주세요.";
  }
  if (normalized.includes("too many requests")) {
    return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  }

  return "로그인에 실패했어요. 잠시 후 다시 시도해 주세요.";
}

function LoginPageContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams?.get("next") ?? "";
  const nextPath = rawNext.startsWith("/") ? rawNext : "/dashboard";
  const justSignedUp = searchParams?.get("signedup") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    const em = email.trim();
    const pw = password;

    if (!em) {
      setErrorMsg("이메일을 입력해 주세요.");
      return;
    }
    if (!pw) {
      setErrorMsg("비밀번호를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: em,
        password: pw,
      });

      if (error) {
        setErrorMsg(mapLoginError(error.message));
        return;
      }

      router.push(nextPath);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-10 px-6">
        {/* Left: product intro */}
        <div className="hidden md:flex flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight">잡 트래커</h1>
          <p className="mt-6 text-zinc-400 text-lg leading-relaxed">
            흩어진 지원 현황을 한곳에서 관리해 보세요.
            <br />
            마감일, 후속 조치, 다음 액션까지 놓치지 않도록 정리해 드려요.
          </p>
          <div className="mt-8 space-y-3 text-zinc-300">
            <div>- 오늘 화면에서 오늘 할 일에 집중</div>
            <div>- 마감과 팔로업 일정을 놓치지 않기</div>
            <div>- 칸반/리스트/캘린더로 지원 흐름 정리</div>
          </div>
        </div>

        {/* Right: login card */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur p-8 shadow-xl">
            <h2 className="text-xl font-semibold">로그인</h2>
            <p className="mt-2 text-sm text-zinc-400">등록한 이메일과 비밀번호로 로그인해 주세요.</p>

            <div aria-live="polite" className="mt-4 min-h-5 text-sm text-red-400">
              {errorMsg || null}
            </div>
            <div aria-live="polite" className="min-h-5 text-sm text-emerald-300">
              {justSignedUp && !errorMsg ? "회원가입이 완료됐어요. 로그인해 주세요." : null}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm text-zinc-300">
                  이메일
                </label>
                <input
                  id="login-email"
                  data-testid="login-email-input"
                  type="email"
                  placeholder="example@email.com"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm text-zinc-300">
                  비밀번호
                </label>
                <input
                  id="login-password"
                  data-testid="login-password-input"
                  type="password"
                  placeholder="비밀번호를 입력해 주세요"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                data-testid="login-submit-button"
                disabled={loading}
                className="w-full rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-medium py-3 hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </form>

            <div className="mt-6 text-sm text-zinc-400 text-center">
              계정이 없나요?{" "}
              <a href="/signup" className="text-white hover:underline">
                회원가입
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950 text-zinc-100" />}>
      <LoginPageContent />
    </Suspense>
  );
}
