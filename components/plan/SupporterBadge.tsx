import type { Plan } from "@/components/dashboard/hooks/useDashboardController";

export function SupporterBadge({ plan }: { plan: Plan }) {
  const isPro = plan === "pro";

  if (!isPro) {
    return (
      <button
        type="button"
        className="inline-flex min-w-[96px] items-center justify-center whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs leading-tight text-zinc-300 transition hover:bg-zinc-900/60"
        title="후원 플랜으로 더 높은 한도를 사용할 수 있습니다."
        aria-label="후원 플랜으로 전환"
      >
        무료 플랜
      </button>
    );
  }

  return (
    <span className="inline-flex min-w-[96px] items-center justify-center gap-1 whitespace-nowrap rounded-full border border-emerald-900/50 bg-emerald-950/30 px-3 py-1 text-xs leading-tight text-emerald-200">
      <span aria-hidden>★</span> 후원 플랜
    </span>
  );
}
