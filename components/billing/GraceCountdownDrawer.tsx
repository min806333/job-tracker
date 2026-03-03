"use client";

import PlanComparisonTable from "@/components/billing/PlanComparisonTable";
import { Drawer } from "@/components/dashboard/common/Drawer";

type GraceCountdownDrawerProps = {
  open: boolean;
  daysLeft: number;
  portalLoading: boolean;
  checkoutLoading: boolean;
  onClose: () => void;
  onManageBilling: () => void;
  onUpgrade: () => void;
};

export default function GraceCountdownDrawer({
  open,
  daysLeft,
  portalLoading,
  checkoutLoading,
  onClose,
  onManageBilling,
  onUpgrade,
}: GraceCountdownDrawerProps) {
  return (
    <Drawer open={open} title="결제 유예 안내" onClose={onClose} widthPx={460}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-800/50 bg-amber-950/20 p-4">
          <div className="text-base font-semibold text-amber-100">유예 종료까지 {daysLeft}일 남았어요</div>
          <div className="mt-2 text-sm leading-relaxed text-zinc-300">
            데이터는 안전하게 유지돼요. 결제 정보를 확인하면 오늘 정리 흐름을 그대로 이어갈 수 있습니다.
          </div>
        </div>

        <PlanComparisonTable currentPlan="grace" freeMaxApps={100} variant="compact" />

        <div className="space-y-2">
          <button
            type="button"
            onClick={onUpgrade}
            disabled={checkoutLoading}
            className="w-full h-10 rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 text-sm font-medium text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            {checkoutLoading ? "결제 페이지 이동 중..." : "Pro로 계속하기"}
          </button>
          <button
            type="button"
            onClick={onManageBilling}
            disabled={portalLoading}
            className="w-full h-10 rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 text-sm text-zinc-200 hover:bg-zinc-900/70 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            {portalLoading ? "결제 관리 접속 중..." : "결제 관리"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
