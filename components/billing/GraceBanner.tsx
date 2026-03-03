"use client";

type GraceBannerProps = {
  daysLeft?: number | null;
  portalLoading: boolean;
  checkoutLoading: boolean;
  onManageBilling: () => void;
  onUpgrade: () => void;
};

function buildGraceMessage(daysLeft?: number | null) {
  if (typeof daysLeft !== "number") {
    return {
      detail: "결제 정보를 확인하면 지금 흐름을 그대로 이어갈 수 있어요.",
      emphasize: false,
    };
  }

  if (daysLeft <= 3) {
    return {
      detail: `유예 종료 D-${Math.max(0, daysLeft)}: 오늘 정리 흐름이 끊기지 않게 결제 정보를 확인해 주세요.`,
      emphasize: true,
    };
  }

  return {
    detail: `유예 종료까지 ${daysLeft}일 남았어요. 자동 정리 흐름을 유지하려면 미리 확인해 두세요.`,
    emphasize: false,
  };
}

export default function GraceBanner({
  daysLeft,
  portalLoading,
  checkoutLoading,
  onManageBilling,
  onUpgrade,
}: GraceBannerProps) {
  const message = buildGraceMessage(daysLeft);

  return (
    <section className="sticky top-0 z-20 border-b border-amber-900/40 bg-amber-950/25 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-semibold text-amber-100">결제 유예 상태</p>
          <p
            className={[
              "text-sm",
              message.emphasize ? "font-semibold text-amber-200" : "text-amber-200/90",
            ].join(" ")}
          >
            {message.detail}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onUpgrade}
            disabled={checkoutLoading}
            className="h-10 rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 text-sm font-medium text-emerald-200 hover:bg-emerald-950/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
          >
            {checkoutLoading ? "결제 페이지 이동 중..." : "Pro로 계속하기"}
          </button>
          <button
            type="button"
            onClick={onManageBilling}
            disabled={portalLoading}
            className="h-10 rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 text-sm text-zinc-200 hover:bg-zinc-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
          >
            {portalLoading ? "결제 관리 접속 중..." : "결제 관리"}
          </button>
        </div>
      </div>
    </section>
  );
}
