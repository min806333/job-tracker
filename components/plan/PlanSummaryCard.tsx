type Props = {
  trackedApplications: number;
  focusPinsActive: number;
  plan: "free" | "pro" | "grace";
  maxApplications?: number;
};

export function PlanSummaryCard({
  trackedApplications,
  focusPinsActive,
  plan,
  maxApplications,
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-sm text-zinc-300">현재 사용량</div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="text-xs text-zinc-400">지원서</div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">
            {trackedApplications}개 관리 중
          </div>
          {typeof maxApplications === "number" && plan === "free" ? (
            <div className="mt-1 text-xs text-zinc-500">
              무료 플랜은 최대 {maxApplications}개까지
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="text-xs text-zinc-400">집중 관리</div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">
            {focusPinsActive}개 활성
          </div>
          <div className="mt-1 text-xs text-zinc-500">무료 플랜에 3개 포함</div>
        </div>
      </div>
    </div>
  );
}
