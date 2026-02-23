"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [debug, setDebug] = useState("");

  async function handleSignup() {
    setErrorMsg("");
    setSuccessMsg("");
    setDebug("버튼 클릭됨 → 입력 검증 중...");

    const em = email.trim();
    const pw = password;

    if (!em || !pw) {
      setErrorMsg("이메일과 비밀번호를 입력해주세요.");
      setDebug("입력 검증 실패: 이메일/비밀번호 비어있음");
      return;
    }
    if (pw.length < 6) {
      setErrorMsg("비밀번호는 6자 이상이어야 해요.");
      setDebug("입력 검증 실패: 비밀번호 6자 미만");
      return;
    }
    if (pw !== password2) {
      setErrorMsg("비밀번호 확인이 일치하지 않아요.");
      setDebug("입력 검증 실패: 비밀번호 확인 불일치");
      return;
    }

    setLoading(true);
    setDebug("Supabase signUp 호출 중...");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: em,
        password: pw,
      });

      if (error) {
        setErrorMsg(error.message);
        setDebug(`signUp 실패: ${error.message}`);
        return;
      }

      // 이메일 인증 ON이면 session이 null인 경우가 흔함
      if (!data.session) {
        setSuccessMsg("가입 완료! 이메일 인증 후 로그인해주세요.");
        setDebug("signUp 성공: session 없음(이메일 인증 필요 가능성)");
        return;
      }

      setSuccessMsg("가입 완료! 대시보드로 이동합니다.");
      setDebug("signUp 성공: session 있음 → /dashboard 이동");
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "회원가입 중 알 수 없는 오류가 발생했어요.");
      setDebug(`예외 발생: ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-10 px-6">
        {/* 좌측: 소개 */}
        <div className="hidden md:flex flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight">Job Tracker</h1>
          <p className="mt-6 text-zinc-400 text-lg leading-relaxed">
            계정을 만들고 오늘부터 지원을 실행해요.
            <br />
            마감 · 팔로업 · Next Action을 한 번에 관리하세요.
          </p>
          <div className="mt-8 space-y-3 text-zinc-300">
            <div>✔ Today로 매일 실행</div>
            <div>✔ 마감/팔로업 놓치지 않기</div>
            <div>✔ 칸반으로 정리</div>
          </div>
        </div>

        {/* 우측: 회원가입 카드 */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur p-8 shadow-xl">
            <h2 className="text-xl font-semibold">회원가입</h2>

            {errorMsg ? (
              <div className="mt-4 text-sm text-red-400">{errorMsg}</div>
            ) : null}

            {successMsg ? (
              <div className="mt-4 text-sm text-emerald-300">{successMsg}</div>
            ) : null}

            {debug ? (
              <div className="mt-3 text-xs text-zinc-400">디버그: {debug}</div>
            ) : null}

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
                placeholder="비밀번호 (6자 이상)"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />

              <input
                type="password"
                placeholder="비밀번호 확인"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault(); // ✅ 엔터로 폼 submit(리로드) 방지
                    handleSignup();
                  }
                }}
              />

              <button
                type="button"
                onClick={handleSignup}
                disabled={loading}
                className="w-full rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-medium py-3 hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {loading ? "가입 중..." : "계정 만들기"}
              </button>
            </div>

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
