"use client";

type HardLimitGateProps = {
  totalApplications: number;
  maxApplications?: number;
  onViewPro: () => void;
  onUpgrade: () => void;
  onCleanup: () => void;
};

export default function HardLimitGate({
  totalApplications,
  maxApplications = 100,
  onViewPro,
  onUpgrade,
  onCleanup,
}: HardLimitGateProps) {
  return (
    <section className="rounded-2xl border border-amber-800/60 bg-amber-950/20 p-5">
      <p className="text-base font-semibold text-amber-100">저장 한도에 도달했어요</p>
      <p className="mt-2 text-sm text-zinc-300">
        지금 상태를 정리하면 다시 흐름을 이어갈 수 있어요. 무료 플랜은 최대{" "}
        <span className="font-semibold text-zinc-100">{maxApplications}건</span>, 현재{" "}
        <span className="font-semibold text-zinc-100">{totalApplications}건</span>이 등록되어 있어요.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onUpgrade}
          className="h-10 rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 text-sm font-medium text-emerald-200 hover:bg-emerald-950/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          Pro로 계속하기
        </button>
        <button
          type="button"
          onClick={onCleanup}
          className="h-10 rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 text-sm text-zinc-200 hover:bg-zinc-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          나중에
        </button>
      </div>
      <button
        type="button"
        onClick={onViewPro}
        className="mt-3 text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500/40 rounded"
      >
        자세히 보기
      </button>
    </section>
  );
}
