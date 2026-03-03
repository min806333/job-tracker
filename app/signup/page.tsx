"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SIGNUP_FALLBACK_ERROR = "회원가입에 실패했어요. 잠시 후 다시 시도해 주세요.";

function mapSignupError(status: number, serverMessage?: string) {
  const normalized = (serverMessage ?? "").toLowerCase();

  if (
    normalized.includes("not allowed") ||
    normalized.includes("admin@") ||
    normalized.includes("administrator")
  ) {
    return "해당 이메일은 사용할 수 없어요.";
  }

  if (status === 400) return "입력 정보를 다시 확인해 주세요.";
  if (status === 401) return "인증에 실패했어요. 다시 시도해 주세요.";
  if (status === 403) return "요청이 거부됐어요. 잠시 후 다시 시도해 주세요.";
  if (status === 409) return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (status >= 500) return "서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";

  return SIGNUP_FALLBACK_ERROR;
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams?.get("next") ?? "";
  const nextPath = rawNext.startsWith("/") ? rawNext : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
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
    if (pw.length < 8) {
      setErrorMsg("비밀번호는 8자 이상으로 설정해 주세요.");
      return;
    }
    if (pw !== password2) {
      setErrorMsg("비밀번호가 일치하지 않아요.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password: pw }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setErrorMsg(mapSignupError(res.status, json?.message));
        return;
      }

      router.push(`/login?next=${encodeURIComponent(nextPath)}&signedup=1`);
    } catch {
      setErrorMsg(SIGNUP_FALLBACK_ERROR);
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
            계정을 만들고 지원 현황 관리를 시작해 보세요.
            <br />
            마감일, 후속 조치, 다음 액션을 한 화면에서 정리할 수 있어요.
          </p>
          <div className="mt-8 space-y-3 text-zinc-300">
            <div>- 오늘 화면에서 오늘 할 일에 집중</div>
            <div>- 마감과 팔로업 일정을 놓치지 않기</div>
            <div>- 칸반/리스트/캘린더로 지원 흐름 정리</div>
          </div>
        </div>

        {/* Right: signup card */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur p-8 shadow-xl">
            <h2 className="text-xl font-semibold">회원가입</h2>
            <p className="mt-2 text-sm text-zinc-400">이메일과 비밀번호로 계정을 만들어 주세요.</p>

            <div aria-live="polite" className="mt-4 min-h-5 text-sm text-red-400">
              {errorMsg || null}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSignup}>
              <div>
                <label htmlFor="signup-email" className="mb-2 block text-sm text-zinc-300">
                  이메일
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="example@email.com"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="mb-2 block text-sm text-zinc-300">
                  비밀번호
                </label>
                <input
                  id="signup-password"
                  type="password"
                  placeholder="8자 이상 입력"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label htmlFor="signup-password-confirm" className="mb-2 block text-sm text-zinc-300">
                  비밀번호 확인
                </label>
                <input
                  id="signup-password-confirm"
                  type="password"
                  placeholder="비밀번호를 다시 입력"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-medium py-3 hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {loading ? "가입 중..." : "회원가입"}
              </button>
            </form>

            <div className="mt-6 text-sm text-zinc-400 text-center">
              이미 계정이 있나요?{" "}
              <a href="/login" className="text-white hover:underline">
                로그인
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950 text-zinc-100" />}>
      <SignupPageContent />
    </Suspense>
  );
}
