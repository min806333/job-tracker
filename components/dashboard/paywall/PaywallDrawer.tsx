"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PlanComparisonTable from "@/components/billing/PlanComparisonTable";
import type { DashboardController } from "../hooks/useDashboardController";
import { Drawer } from "../common/Drawer";
import { track } from "@/lib/analytics/track";

function normalizeReason(raw?: string) {
  const reason = (raw ?? "").trim();
  if (!reason) {
    return {
      title: "이 기능은 Pro에서 제공돼요",
      body: "지금 시도한 기능은 Pro 플랜에서 사용할 수 있습니다.",
    };
  }

  return {
    title: "이 기능은 Pro에서 제공돼요",
    body: reason,
  };
}

export default function PaywallDrawer({ c }: { c: DashboardController }) {
  const router = useRouter();
  const [dontShowToday, setDontShowToday] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const reason = useMemo(() => normalizeReason(c.paywallReason), [c.paywallReason]);

  function close() {
    c.setPaywallOpen(false);
    if (dontShowToday) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem("jt_paywall_snooze", today);
      } catch {}
    }
  }

  function goPlanCompare() {
    const reasonKey = (c.paywallReason || "paywall_drawer_plan").trim() || "paywall_drawer_plan";
    void track("paywall_cta_clicked", {
      reason: reasonKey,
      cta: "upgrade",
      plan: c.plan,
    });
    void track("upsell_cta_clicked", { from: "paywall", action: "details", plan: c.plan });
    close();
    router.push("/dashboard/plan#compare");
  }

  async function startCheckout() {
    if (checkoutLoading) return;
    setCheckoutError(null);
    setCheckoutLoading(true);
    const reasonKey = (c.paywallReason || "paywall_drawer_checkout").trim() || "paywall_drawer_checkout";
    try {
      void track("paywall_cta_clicked", {
        reason: reasonKey,
        cta: "upgrade",
        plan: c.plan,
      });
      void track("upsell_cta_clicked", { from: "paywall", action: "primary", plan: c.plan });

      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const text = await res.text();
      const data = text ? (JSON.parse(text) as { url?: string; error?: string }) : null;
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "결제 페이지로 이동하지 못했습니다.");
      }
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "결제 연결 중 오류가 발생했습니다.";
      setCheckoutError(message);
    } finally {
      setCheckoutLoading(false);
    }
  }

  function dismiss() {
    const reasonKey = (c.paywallReason || "paywall_drawer_dismiss").trim() || "paywall_drawer_dismiss";
    void track("paywall_cta_clicked", {
      reason: reasonKey,
      cta: "dismiss",
      plan: c.plan,
    });
    void track("upsell_cta_clicked", { from: "paywall", action: "secondary", plan: c.plan });
    close();
  }

  return (
    <Drawer open={c.paywallOpen} onClose={close} title="Pro로 업그레이드">
      <div className="flex h-full justify-end">
        <div className="h-full w-[420px] max-w-[92vw] border-l border-zinc-800 bg-zinc-950">
          <div className="space-y-4 px-4 py-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-500">제한된 이유</div>
              <div className="mt-1 text-base font-semibold text-zinc-100">오늘 할 일을 더 정확히 정리하려면 Pro가 필요해요</div>
              <div className="mt-2 text-sm leading-relaxed text-zinc-400">{reason.body}</div>
            </div>

            <PlanComparisonTable currentPlan={c.plan} freeMaxApps={100} variant="compact" />

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => void startCheckout()}
                disabled={checkoutLoading}
                className="w-full h-10 rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-950/40 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {checkoutLoading ? "결제 페이지 이동 중..." : "Pro로 계속하기"}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="w-full h-10 rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 text-sm text-zinc-200 transition hover:bg-zinc-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={goPlanCompare}
                className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500/40 rounded"
              >
                자세히 보기
              </button>
              {checkoutError ? <div className="text-sm text-red-300">{checkoutError}</div> : null}
            </div>

            <label className="flex items-center gap-2 pt-1 text-[11px] text-zinc-500">
              <input
                type="checkbox"
                checked={dontShowToday}
                onChange={(e) => setDontShowToday(e.target.checked)}
                className="accent-emerald-500"
              />
              오늘은 이 안내를 그만 보기
            </label>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
