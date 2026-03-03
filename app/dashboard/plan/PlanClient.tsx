"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDashboardController } from "@/components/dashboard/hooks/useDashboardController";
import type { Application } from "@/lib/applications/types";
import PlanComparisonTable from "@/components/billing/PlanComparisonTable";
import { SupporterBadge } from "@/components/plan/SupporterBadge";
import { PlanSummaryCard } from "@/components/plan/PlanSummaryCard";
import { SupporterPanel } from "@/components/plan/SupporterPanel";
import { track } from "@/lib/analytics/track";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { sanitizeTextForClipboard } from "@/lib/text/sanitize";

type Props = {
  userId: string;
  userEmail: string;
  initialApplications?: Application[];
};

const FREE_MAX_APPS = 100;

async function parseResponseBody(res: Response): Promise<{ data: unknown; text: string }> {
  const text = await res.text();
  if (!text) return { data: null, text: "" };
  try {
    return { data: JSON.parse(text), text };
  } catch {
    return { data: null, text };
  }
}

function safeJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
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
  const [showFullUserId, setShowFullUserId] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);

  const plan = c.plan;
  const isGrace = plan === "grace";
  const isPro = plan === "pro";
  const planLabel = plan === "pro" ? "Pro" : plan === "grace" ? "결제 유예 상태" : "Free";
  const maxApplications = c.entitlements?.maxApplications;

  const trackedApplications = initialApplications?.length ?? 0;
  const focusPinsActive = 3;
  const checkoutPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? "unknown";

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
    void track("paywall_cta_clicked", {
      reason: "plan_page_checkout",
      cta: "upgrade",
      plan: c.plan,
    });
    void track("checkout_started", { price_id: checkoutPriceId });
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const { data, text } = await parseResponseBody(res);
      const body = toObject(data);
      const errorMessage = body && typeof body.error === "string" ? body.error : null;
      const url = body && typeof body.url === "string" ? body.url : null;

      if (!res.ok) {
        throw new Error(errorMessage ?? (text.trim() || "결제 페이지를 열지 못했습니다."));
      }
      if (!url) {
        throw new Error("결제 페이지 URL을 받지 못했습니다.");
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
      const body = toObject(data);
      const errorMessage = body && typeof body.error === "string" ? body.error : null;
      const ok = body?.ok === true;

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
      const body = toObject(data);
      const ok = body?.ok === true;
      const url = body && typeof body.url === "string" ? body.url : null;
      const message = body && typeof body.message === "string" ? body.message : null;

      if (!res.ok || !ok) {
        throw new Error(message ?? (text.trim() || "결제 관리 페이지에 접속할 수 없습니다."));
      }
      if (!url) {
        throw new Error("결제 관리 URL을 찾지 못했습니다.");
      }
      void track("paywall_cta_clicked", {
        reason: "plan_page_billing_portal",
        cta: "billing_portal",
        plan: c.plan,
      });
      void track("billing_portal_opened", {});
      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "결제 관리 접속 중 오류가 발생했습니다.";
      setPortalError(message);
    } finally {
      setPortalLoading(false);
    }
  }

  async function toggleUserIdView() {
    setShowFullUserId((v) => !v);

    try {
      await navigator.clipboard.writeText(sanitizeTextForClipboard(userId, "(empty)"));
      setCopiedUserId(true);
      window.setTimeout(() => setCopiedUserId(false), 1500);
    } catch {
      setCopiedUserId(false);
    }
  }

  return (
    <div data-testid="plan-page" className="mx-auto w-full max-w-5xl px-6 py-8 text-zinc-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-zinc-100">요금제 관리</div>
          <div className="mt-1 text-sm text-zinc-400">현재 플랜과 Free/Pro 차이를 확인하고 필요한 작업을 진행하세요.</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/dashboard"
            className="inline-flex min-w-[120px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-center text-xs leading-tight whitespace-nowrap text-zinc-300 transition hover:bg-zinc-900/60"
          >
            대시보드로 돌아가기
          </Link>
          <SupporterBadge plan={plan} />
        </div>
      </div>

      <section id="compare" className="mt-6 scroll-mt-24">
        <PlanComparisonTable currentPlan={plan} freeMaxApps={FREE_MAX_APPS} variant="full" />
      </section>

      <div className="mt-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/60 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-zinc-500">사용자</div>
            <div className="mt-0.5 text-sm text-zinc-200">{userEmail}</div>
          </div>
          <button
            type="button"
            onClick={() => void toggleUserIdView()}
            className="cursor-pointer select-none rounded-lg px-2 py-1 text-left text-xs text-zinc-400 transition hover:bg-zinc-800/50"
            title="클릭하여 사용자 ID 전체 보기/접기"
            aria-expanded={showFullUserId}
            aria-label={showFullUserId ? "사용자 ID 접기" : "사용자 ID 전체 보기"}
          >
            <div className="flex items-center justify-end gap-2">
              <span className={showFullUserId ? "break-all whitespace-normal text-zinc-300" : "max-w-[180px] sm:max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap text-zinc-300"}>
                사용자 ID: {showFullUserId ? userId : `${userId?.slice(0, 8) ?? "--"}...`}
              </span>
              <span className="shrink-0 text-zinc-500">{showFullUserId ? "접기" : "전체 보기"}</span>
            </div>
            {copiedUserId ? <div className="mt-1 text-right text-[11px] text-emerald-300">복사됨</div> : null}
          </button>
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
          플랜: <span className="font-semibold text-zinc-100">{planLabel}</span>
        </div>
        <div className="mt-2 text-sm text-zinc-400">{loadingSub ? "불러오는 중..." : subStatus ?? "활성 구독이 없습니다."}</div>
        {currentPeriodEnd ? (
          <div className="mt-1 text-xs text-zinc-500">
            현재 결제 주기 종료일: {new Date(currentPeriodEnd).toLocaleDateString()}
          </div>
        ) : null}
        {isGrace ? (
          <div className="mt-3 rounded-xl border border-amber-900/30 bg-amber-950/20 p-3 text-sm text-amber-200">
            <div>결제 정보 확인 후 다시 Pro 기능을 바로 복구할 수 있습니다. 기존 데이터는 안전하게 유지됩니다.</div>
            <button
              type="button"
              onClick={() => void openBillingPortal()}
              disabled={portalLoading}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-amber-800/50 bg-amber-950/40 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-950/60 disabled:opacity-50"
            >
              {portalLoading ? "결제 관리 접속 중..." : "결제 관리로 이동"}
            </button>
          </div>
        ) : null}
        {isPro && !cancelAtPeriodEnd ? (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void cancelSubscription()}
              disabled={cancelLoading}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50 disabled:opacity-50"
            >
              {cancelLoading ? "취소 처리 중..." : "구독 취소"}
            </button>
            {cancelError ? <div className="text-sm text-red-300">{cancelError}</div> : null}
          </div>
        ) : null}
        {isPro && cancelAtPeriodEnd ? <div className="mt-3 text-sm text-amber-300">구독 취소가 예약되었습니다.</div> : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isPro ? (
          <>
            <button
              type="button"
              onClick={() => {
                void track("plan_comparison_cta_clicked", { action: "manage", from: "plan" });
                void track("upsell_cta_clicked", { from: "plan_page", action: "secondary", plan: c.plan });
                void openBillingPortal();
              }}
              disabled={portalLoading}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50 disabled:opacity-50"
            >
              {portalLoading ? "결제 관리 접속 중..." : "결제 관리"}
            </button>
            <span className="rounded-full border border-emerald-700/50 bg-emerald-950/30 px-2.5 py-1 text-xs text-emerald-200">
              현재 Pro
            </span>
          </>
        ) : (
          <button
            type="button"
            data-testid="plan-upgrade-button"
            onClick={() => {
              void track("plan_comparison_cta_clicked", { action: "upgrade", from: "plan" });
              void track("upsell_cta_clicked", { from: "plan_page", action: "primary", plan: c.plan });
              void startCheckout();
            }}
            disabled={checkoutLoading}
            className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-50"
          >
            {checkoutLoading ? "결제 페이지로 이동 중..." : "Pro로 업그레이드"}
          </button>
        )}
        {checkoutError ? <div className="text-sm text-red-300">{checkoutError}</div> : null}
        {portalError ? <div className="text-sm text-red-300">{portalError}</div> : null}
      </div>
    </div>
  );
}
