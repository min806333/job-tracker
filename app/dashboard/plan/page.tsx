"use client";

import { useDashboardController } from "@/components/dashboard/hooks/useDashboardController";
import { SupporterBadge } from "@/components/plan/SupporterBadge";
import { PlanSummaryCard } from "@/components/plan/PlanSummaryCard";
import { SupporterPanel } from "@/components/plan/SupporterPanel";

type Props = {
  userId: string;
  userEmail: string;
  initialApplications?: any[];
};

export default function PlanClient({ userId, userEmail, initialApplications = [] }: Props) {
  const c = useDashboardController({
    userId,
    userEmail,
    initialApplications,
  });

  const plan = c.plan;
  const maxApplications = c.entitlements?.maxApplications;

  const trackedApplications = initialApplications?.length ?? 0;
  const focusPinsActive = 3; // 지금은 Top3 고정이면 3, 아니면 추후 연결

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 text-zinc-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-zinc-100">내 사용 상태</div>
          <div className="mt-1 text-sm text-zinc-400">
            현재 사용 중인 계정과 응원 상태를 확인할 수 있어요.
          </div>
        </div>
        <SupporterBadge plan={plan} />
      </div>

      {/* 로그인 인포 바 */}
      <div className="mt-5 flex items-center justify-between rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-4 py-3">
        <div>
          <div className="text-[11px] text-zinc-500">로그인</div>
          <div className="mt-0.5 text-sm text-zinc-200">{userEmail}</div>
        </div>

        <div className="text-xs text-zinc-500">
          ID: <span className="text-zinc-300">{userId?.slice(0, 8) ?? "—"}…</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <PlanSummaryCard
          plan={plan}
          trackedApplications={trackedApplications}
          focusPinsActive={focusPinsActive}
          maxApplications={maxApplications}
        />

        {/* Supporter 섹션만 은은하게 강조 */}
        <div className="rounded-2xl border border-emerald-900/30 bg-gradient-to-b from-emerald-950/30 to-zinc-950/60 p-0 shadow-[0_0_0_1px_rgba(16,185,129,0.06)]">
          <SupporterPanel plan={plan} />
        </div>
      </div>
    </div>
  );
}