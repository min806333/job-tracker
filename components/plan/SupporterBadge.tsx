import type { DashboardController } from "@/components/dashboard/hooks/useDashboardController";

export function SupporterBadge({ c }: { c: DashboardController }) {
  const isPro = c.plan === "pro";

  if (!isPro) {
    return (
      <button
        type="button"
        onClick={() => c.setPaywallOpen(true)}
        className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-900/60 transition"
        title="Supporter로 응원하면 제한이 완화돼요"
        aria-label="Supporter로 응원하기"
      >
        Free 사용 중
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-900/50 bg-emerald-950/30 px-2 py-0.5 text-xs text-emerald-200">
      <span aria-hidden>💚</span> Supporter
    </span>
  );
}