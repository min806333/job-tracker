"use client";

import type { DashboardController } from "@/components/dashboard/hooks/useDashboardController";

export function PlanBadge({ c }: { c: DashboardController }) {
  const isPro = c.plan === "pro";

  if (isPro) {
    return (
      <span
        className="
          relative px-2.5 py-1 text-xs rounded-md
          border border-emerald-900/40
          bg-emerald-950/30 text-emerald-200
          shadow-[0_0_12px_rgba(16,185,129,0.25)]
          hover:shadow-[0_0_18px_rgba(16,185,129,0.35)]
          hover:scale-[1.03]
          transition-all duration-300
          animate-[pulse_4s_ease-in-out_infinite]
        "
      >
        💚 Supporter
      </span>
    );
  }

  // FREE일 때 클릭하면 paywall 열리게 하면 전환 UX도 좋아짐
  return (
    <button
      type="button"
      onClick={() => c.setPaywallOpen(true)}
      className="
        px-2.5 py-1 text-xs rounded-md
        border border-zinc-700
        bg-zinc-800 text-zinc-400
        hover:bg-zinc-700
        hover:ring-1 hover:ring-emerald-500/30
        transition-all duration-200
      "
      title="Supporter로 응원하면 제한이 완화돼요"
      aria-label="Supporter로 응원하기"
    >
      FREE
    </button>
  );
}