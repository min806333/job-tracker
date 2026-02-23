"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin() {
    setErrorMsg("");

    const em = email.trim();
    const pw = password;

    if (!em || !pw) {
      setErrorMsg("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: em,
        password: pw,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-10 px-6">
        {/* 좌측: 제품 소개 */}
        <div className="hidden md:flex flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight">Job Tracker</h1>
          <p className="mt-6 text-zinc-400 text-lg leading-relaxed">
            오늘 해야 할 지원을 놓치지 마세요.
            <br />
            마감 · 팔로업 · Next Action을 한 번에 관리하세요.
          </p>
          <div className="mt-8 space-y-3 text-zinc-300">
            <div>✔ Today로 매일 실행</div>
            <div>✔ 마감/팔로업 놓치지 않기</div>
            <div>✔ 칸반으로 정리</div>
          </div>
        </div>

        {/* 우측: 로그인 카드 */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur p-8 shadow-xl">
            <h2 className="text-xl font-semibold">로그인</h2>

            {errorMsg ? <div className="mt-4 text-sm text-red-400">{errorMsg}</div> : null}

            <div className="mt-6 space-y-4">
              <input
                type="email"
                placeholder="이메일"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              <input
                type="password"
                placeholder="비밀번호"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
              />

              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="w-full rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-medium py-3 hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </div>

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
