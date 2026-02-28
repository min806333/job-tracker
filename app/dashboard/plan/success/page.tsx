"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Plan = "free" | "pro" | "grace";
type Status = "processing" | "success" | "timeout" | "error";

const POLL_MS = 1500;
const TIMEOUT_MS = 30000;

function safeJson(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function PlanSuccessPage() {
  const router = useRouter();

  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [status, setStatus] = useState<Status>("processing");
  const [message, setMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const redirectedRef = useRef(false);

  const stopTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopRedirectInterval = () => {
    if (redirectIntervalRef.current) {
      clearInterval(redirectIntervalRef.current);
      redirectIntervalRef.current = null;
    }
  };

  const goToDashboard = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    stopRedirectInterval();
    router.push("/dashboard");
  }, [router]);

  const fetchPlan = async (): Promise<Plan | null> => {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;

    try {
      const res = await fetch("/api/me/plan", { method: "GET" });
      const text = await res.text();
      const data = safeJson(text) as
        | { ok?: boolean; plan?: Plan; message?: string }
        | null;

      if (!res.ok || !data || data.ok !== true) {
        setMessage(
          data?.message ??
            (text.trim() || "플랜 정보를 불러오지 못했습니다.")
        );
        setStatus("error");
        return null;
      }

      const nextPlan = data.plan ?? "free";
      setPlan(nextPlan);

      if (nextPlan === "pro") {
        setStatus("success");
      }

      return nextPlan;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "플랜 정보를 불러오지 못했습니다.";
      setMessage(msg);
      setStatus("error");
      return null;
    } finally {
      inFlightRef.current = false;
    }
  };

  const scheduleNext = () => {
    const elapsed = Date.now() - startRef.current;

    if (elapsed >= TIMEOUT_MS) {
      setStatus("timeout");
      void fetch("/api/me/plan?log=timeout", { method: "GET" });
      return;
    }

    timerRef.current = setTimeout(async () => {
      await runPoll();
    }, POLL_MS);
  };

  const runPoll = async () => {
    // 이미 성공/타임아웃이면 종료
    if (status === "success" || status === "timeout") return;

    const nextPlan = await fetchPlan();

    // pro가 아니면 계속 폴링 (processing 상태일 때만)
    if (nextPlan !== "pro" && status === "processing") {
      scheduleNext();
    }
  };

  const handleRefresh = async () => {
    stopTimer();
    startRef.current = Date.now();
    setStatus("processing");
    setMessage(null);
    await runPoll();
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const text = await res.text();
      const data = safeJson(text);

      const ok = data && typeof data === "object" && data.ok === true;
      const url =
        data && typeof data === "object" && typeof data.url === "string"
          ? data.url
          : null;
      const msg =
        data && typeof data === "object" && typeof data.message === "string"
          ? data.message
          : null;

      if (!res.ok || !ok || !url) {
        throw new Error(msg ?? (text.trim() || "결제 관리로 이동할 수 없습니다."));
      }

      window.location.href = url;
    } catch {
      router.push("/dashboard/plan");
    } finally {
      setPortalLoading(false);
    }
  };

  // ✅ 세션 유무 판별 + (세션 있을 때만) polling 시작
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      setHasSession(false);
      return () => {
        stopTimer();
        stopRedirectInterval();
      };
    }

    setHasSession(true);
    runPoll();

    return () => {
      stopTimer();
      stopRedirectInterval();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 훅 개수 불일치 방지: 조기 return보다 위에서 항상 실행되는 effect로 countdown 처리
  useEffect(() => {
    if (hasSession !== true || plan !== "pro") {
      stopRedirectInterval();
      setCountdown(null);
      return;
    }

    redirectedRef.current = false;
    setCountdown(3);
    stopRedirectInterval();

    redirectIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        const current = prev ?? 3;
        if (current <= 1) {
          goToDashboard();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      stopRedirectInterval();
    };
  }, [goToDashboard, hasSession, plan]);

  // ✅ 직접 접근 시 안내 화면
  if (hasSession === false) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <div className="text-lg font-semibold">
              이 페이지는 결제 완료 후 자동으로 이동됩니다.
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/plan")}
              className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50"
            >
              플랜 페이지로 이동
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-emerald-900/30 bg-gradient-to-b from-emerald-950/30 to-zinc-950/60 p-6 shadow-[0_0_0_1px_rgba(16,185,129,0.06)]">
          <div className="text-2xl font-semibold">플랜 확인 중</div>
          <div className="mt-2 text-sm text-zinc-400">
            {status === "success"
              ? "Pro 활성화 완료"
              : status === "timeout"
              ? "아직 플랜 반영이 완료되지 않았어요. 잠시 후 다시 시도해 주세요."
              : status === "error"
              ? message ?? "일시적인 문제가 발생했습니다."
              : "결제 완료를 확인하고 있어요. 잠시만 기다려 주세요."}
          </div>

          {status === "processing" ? (
            <div className="mt-4 text-xs text-zinc-500">
              자동으로 확인 중이며 완료되면 바로 안내해 드립니다.
            </div>
          ) : null}

          {status === "success" ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={goToDashboard}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50"
              >
                지금 대시보드로 이동
              </button>
              <Link
                href="/dashboard/plan"
                className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-950/40"
              >
                플랜 관리로 이동
              </Link>
              {countdown !== null ? (
                <div className="text-xs text-zinc-400">
                  {countdown}초 후 자동으로 이동합니다.
                </div>
              ) : null}
            </div>
          ) : null}

          {status === "timeout" ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50"
              >
                다시 확인
              </button>
              <Link
                href="/dashboard/plan"
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50"
              >
                플랜 페이지로 이동
              </Link>
              <button
                type="button"
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-50"
              >
                {portalLoading ? "결제 관리 접속 중..." : "결제 관리로 이동"}
              </button>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50"
              >
                다시 시도
              </button>
              <Link href="/dashboard/plan" className="text-sm text-zinc-400 hover:text-zinc-200">
                플랜 관리로 이동
              </Link>
            </div>
          ) : null}

          {plan ? (
            <div className="mt-6 text-xs text-zinc-600">현재 플랜: {plan}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}