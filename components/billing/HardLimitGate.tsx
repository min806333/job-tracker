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
      <p className="text-base font-semibold text-amber-100">무료 플랜 추가 한도에 도달했어요</p>
      <p className="mt-2 text-sm text-zinc-300">
        무료 플랜은 최대 <span className="font-semibold text-zinc-100">{maxApplications}개</span>까지
        등록할 수 있습니다. 현재{" "}
        <span className="font-semibold text-zinc-100">{totalApplications}개</span>가 등록되어 있어 새 항목
        추가가 제한됩니다.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onUpgrade}
          className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-950/40"
        >
          Pro로 업그레이드
        </button>
        <button
          type="button"
          onClick={onViewPro}
          className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/70"
        >
          Pro 기능 보기
        </button>
        <button
          type="button"
          onClick={onCleanup}
          className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50"
        >
          기존 항목 정리하기
        </button>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        팁: 리스트 탭에서 아카이브/삭제로 우선순위가 낮은 항목을 정리해 보세요.
      </p>
    </section>
  );
}
