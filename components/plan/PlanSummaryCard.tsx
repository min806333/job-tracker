type Props = {
  trackedApplications: number; // 예: 6
  focusPinsActive: number;     // 예: 3
  plan: "free" | "pro";
  maxApplications?: number;    // UI에 크게 안 보이게 '작게'만
};

export function PlanSummaryCard({
  trackedApplications,
  focusPinsActive,
  plan,
  maxApplications,
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-sm text-zinc-300">현재 사용 상태</div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="text-xs text-zinc-400">지원 항목</div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">
            {trackedApplications}개 추적 중
          </div>
          {typeof maxApplications === "number" && plan === "free" ? (
            <div className="mt-1 text-xs text-zinc-500">
              Free는 최대 {maxApplications}개까지 (표시는 작게)
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="text-xs text-zinc-400">Focus Top</div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">
            {focusPinsActive}개 사용 중
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Top3는 항상 무료로 제공돼요
          </div>
        </div>
      </div>
    </div>
  );
}