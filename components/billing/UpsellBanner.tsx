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
        isStrong
          ? "border-amber-800/50 bg-amber-950/20"
          : "border-zinc-800 bg-zinc-900/40",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-100">
            {isStrong ? "무료 플랜 한도에 거의 도달했어요" : "무료 플랜 사용량이 빠르게 늘고 있어요"}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            현재 <span className="font-semibold text-zinc-100">{totalApplications}개</span>의 지원 항목을
            관리 중입니다.
            {isStrong
              ? " 100개 도달 시 새 항목 추가가 제한됩니다."
              : " 100개부터 새 항목 추가가 제한됩니다."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onViewPro}
            className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/70"
          >
            Pro 기능 보기
          </button>
          {isStrong ? (
            <button
              type="button"
              onClick={onUpgrade}
              className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-950/40"
            >
              Pro로 업그레이드
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCleanup}
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50"
          >
            기존 항목 정리하기
          </button>
        </div>
      </div>
    </section>
  );
}
