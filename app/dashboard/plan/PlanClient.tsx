"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDashboardController } from "@/components/dashboard/hooks/useDashboardController";
import { SupporterBadge } from "@/components/plan/SupporterBadge";
import { PlanSummaryCard } from "@/components/plan/PlanSummaryCard";
import { SupporterPanel } from "@/components/plan/SupporterPanel";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  userId: string;
  userEmail: string;
  initialApplications?: any[];
};

async function parseResponseBody(res: Response): Promise<{ data: any; text: string }> {
  const text = await res.text();
  if (!text) return { data: null, text: "" };
  try {
    return { data: JSON.parse(text), text };
  } catch {
    return { data: null, text };
  }
}

function safeJson(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function PlanClient({ userId, userEmail, initialApplications = [] }: Props) {
  const c = useDashboardController({
    userId,
    userEmail,
    initialApplications,
  });

  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [loadingSub, setLoadingSub] = useState(false);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const plan = c.plan;
  const planLabel =
    plan === "pro" ? "Pro" : plan === "grace" ? "\uACB0\uC81C \uC720\uC608 \uC0C1\uD0DC" : "Free";
  const isGrace = plan === "grace";
  const maxApplications = c.entitlements?.maxApplications;

  const trackedApplications = initialApplications?.length ?? 0;
  const focusPinsActive = 3;

  useEffect(() => {
    let active = true;
    async function loadSubscription() {
      setLoadingSub(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase
          .from("subscriptions")
          .select("status, cancel_at_period_end, current_period_end")
          .eq("user_id", userId)
          .single();
        if (!active) return;
        setSubStatus(data?.status ?? null);
        setCancelAtPeriodEnd(!!data?.cancel_at_period_end);
        setCurrentPeriodEnd(data?.current_period_end ?? null);
      } finally {
        if (active) setLoadingSub(false);
      }
    }
    void loadSubscription();
    return () => {
      active = false;
    };
  }, [userId]);

  async function startCheckout() {
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const { data, text } = await parseResponseBody(res);
      const errorMessage =
        data && typeof data === "object" && typeof data.error === "string" ? data.error : null;
      const url = data && typeof data === "object" && typeof data.url === "string" ? data.url : null;

      if (!res.ok) {
        throw new Error(errorMessage ?? (text.trim() || "결제 페이지를 열지 못했습니다."));
      }
      if (!url) {
        throw new Error("결제 페이지 주소를 받지 못했습니다.");
      }
      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "결제 진행 중 오류가 발생했습니다.";
      setCheckoutError(message);
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function cancelSubscription() {
    setCancelError(null);
    setCancelLoading(true);
    try {
      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const { data, text } = await parseResponseBody(res);
      const errorMessage =
        data && typeof data === "object" && typeof data.error === "string" ? data.error : null;
      const ok = data && typeof data === "object" && data.ok === true;

      if (!res.ok || !ok) {
        throw new Error(errorMessage ?? (text.trim() || "구독 취소 처리에 실패했습니다."));
      }
      setCancelAtPeriodEnd(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "구독 취소 중 오류가 발생했습니다.";
      setCancelError(message);
    } finally {
      setCancelLoading(false);
    }
  }

  async function openBillingPortal() {
    setPortalError(null);
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const text = await res.text();
      const data = safeJson(text);
      const ok = data && typeof data === "object" && data.ok === true;
      const url = data && typeof data === "object" && typeof data.url === "string" ? data.url : null;
      const message =
        data && typeof data === "object" && typeof data.message === "string" ? data.message : null;

      if (!res.ok || !ok) {
        throw new Error(message ?? (text.trim() || "\uACB0\uC81C \uAD00\uB9AC \uD398\uC774\uC9C0\uC5D0 \uC811\uC18D\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."));
      }
      if (!url) {
        throw new Error("결제 관리 URL을 찾지 못했습니다.");
      }
      window.location.href = url;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "결제 관리 접속 중 오류가 발생했습니다.";
      setPortalError(message);
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 text-zinc-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-zinc-100">요금제 상태</div>
          <div className="mt-1 text-sm text-zinc-400">현재 요금제와 사용량을 확인하세요.</div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900/60 transition"
          >
            ← 대시보드로 돌아가기
          </Link>
          <SupporterBadge plan={plan} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-4 py-3">
        <div>
          <div className="text-[11px] text-zinc-500">사용자</div>
          <div className="mt-0.5 text-sm text-zinc-200">{userEmail}</div>
        </div>

        <div className="text-xs text-zinc-500">
          사용자 ID: <span className="text-zinc-300">{userId?.slice(0, 8) ?? "--"}...</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <PlanSummaryCard
          plan={plan}
          trackedApplications={trackedApplications}
          focusPinsActive={focusPinsActive}
          maxApplications={maxApplications}
        />

        <div className="rounded-2xl border border-emerald-900/30 bg-gradient-to-b from-emerald-950/30 to-zinc-950/60 p-0 shadow-[0_0_0_1px_rgba(16,185,129,0.06)]">
          <SupporterPanel plan={plan} />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="text-sm font-medium text-zinc-100">구독 상태</div>
        <div className="mt-1 text-sm text-zinc-300">
          {"\uD50C\uB79C"}: <span className="font-semibold text-zinc-100">{planLabel}</span>
        </div>
        <div className="mt-2 text-sm text-zinc-400">
          {loadingSub ? "불러오는 중..." : subStatus ?? "활성 구독이 없습니다"}
        </div>
        {currentPeriodEnd ? (
          <div className="mt-1 text-xs text-zinc-500">
            현재 결제 주기 종료일: {new Date(currentPeriodEnd).toLocaleDateString()}
          </div>
        ) : null}
        {isGrace ? (
          <div className="mt-3 rounded-xl border border-amber-900/30 bg-amber-950/20 p-3 text-sm text-amber-200">
            <div>
              \uACB0\uC81C\uAC00 \uC544\uC9C1 \uD655\uC778\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694. \uCE74\uB4DC \uC815\uBCF4\uB97C \uD655\uC778\uD558\uBA74 Pro\uAC00 \uB2E4\uC2DC \uD65C\uC131\uD654\uB429\uB2C8\uB2E4.
            </div>
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-amber-800/50 bg-amber-950/40 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-950/60 disabled:opacity-50"
            >
              {portalLoading ? "\uACB0\uC81C \uAD00\uB9AC \uC811\uC18D \uC911..." : "\uACB0\uC81C \uAD00\uB9AC\uB85C \uC774\uB3D9"}
            </button>
          </div>
        ) : null}
        {plan === "pro" && !cancelAtPeriodEnd ? (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={cancelSubscription}
              disabled={cancelLoading}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50 disabled:opacity-50"
            >
              {cancelLoading ? "취소 처리 중..." : "구독 취소"}
            </button>
            {cancelError ? <div className="text-sm text-red-300">{cancelError}</div> : null}
          </div>
        ) : null}
        {plan === "pro" && cancelAtPeriodEnd ? (
          <div className="mt-3 text-sm text-amber-300">구독 취소가 예약되었습니다</div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={startCheckout}
          disabled={checkoutLoading}
          className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-50"
        >
          {checkoutLoading ? "\uACB0\uC81C \uD398\uC774\uC9C0\uB85C \uC774\uB3D9 \uC911..." : "Stripe\uB85C \uC5C5\uADF8\uB808\uC774\uB4DC"}
        </button>
        <button
          type="button"
          onClick={openBillingPortal}
          disabled={portalLoading}
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50 disabled:opacity-50"
        >
          {portalLoading ? "\uACB0\uC81C \uAD00\uB9AC \uC811\uC18D \uC911..." : "\uACB0\uC81C \uAD00\uB9AC(\uCE74\uB4DC/\uD574\uC9C0/\uC601\uC218\uC99D)"}
        </button>
        {checkoutError ? <div className="text-sm text-red-300">{checkoutError}</div> : null}
        {portalError ? <div className="text-sm text-red-300">{portalError}</div> : null}
      </div>
    </div>
  );
}
