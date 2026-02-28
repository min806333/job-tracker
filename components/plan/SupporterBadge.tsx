import type { Plan } from "@/components/dashboard/hooks/useDashboardController";

export function SupporterBadge({ plan }: { plan: Plan }) {
  const isPro = plan === "pro";

  if (!isPro) {
    return (
      <button
        type="button"
        className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-900/60 transition"
        title="후원 플랜으로 더 높은 한도를 사용할 수 있습니다."
        aria-label="후원 플랜으로 전환"
      >
        무료 플랜
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-900/50 bg-emerald-950/30 px-2 py-0.5 text-xs text-emerald-200">
      <span aria-hidden>★</span> 후원 플랜
    </span>
  );
}
