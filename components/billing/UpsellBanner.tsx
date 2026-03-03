"use client";

type UpsellBannerProps = {
  totalApplications: number;
  level: "soft" | "strong";
  onViewPro: () => void;
  onUpgrade: () => void;
  onCleanup: () => void;
};

export default function UpsellBanner({
  totalApplications,
  level,
  onViewPro,
  onUpgrade,
  onCleanup,
}: UpsellBannerProps) {
  const isStrong = level === "strong";

  return (
    <section
      className={[
        "rounded-2xl border p-4",
        isStrong ? "border-amber-800/50 bg-amber-950/20" : "border-zinc-800 bg-zinc-900/40",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{isStrong ? "지금 정리 방식을 바꾸면 마감 누락을 줄일 수 있어요" : "오늘 할 일을 자동으로 정리하면 부담이 줄어요"}</p>
          <p className="mt-1 text-sm text-zinc-400">
            현재 <span className="font-semibold text-zinc-100">{totalApplications}건</span>을 관리 중이에요.
            {isStrong ? " 우선순위 자동 정리와 빠른 후속처리로 누락을 줄여보세요." : " Pro는 정리/우선순위 추천으로 집중 흐름을 유지해줘요."}
          </p>
          <button
            type="button"
            onClick={onViewPro}
            className="mt-2 text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500/40 rounded"
          >
            자세히 보기
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
      </div>
    </section>
  );
}
