"use client";

type GraceBannerProps = {
  daysLeft?: number | null;
  portalLoading: boolean;
  onManageBilling: () => void;
  onViewPro: () => void;
};

function buildGraceMessage(daysLeft?: number | null) {
  if (typeof daysLeft !== "number") {
    return {
      detail: "유예 기간이 곧 종료될 수 있어요.",
      emphasize: false,
    };
  }

  if (daysLeft <= 3) {
    return {
      detail: `유예 종료 D-${Math.max(0, daysLeft)}: 결제 정보 확인이 필요합니다.`,
      emphasize: true,
    };
  }

  return {
    detail: `유예 종료까지 ${daysLeft}일 남았어요.`,
    emphasize: false,
  };
}

export default function GraceBanner({
  daysLeft,
  portalLoading,
  onManageBilling,
  onViewPro,
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
            onClick={onViewPro}
            className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/70"
          >
            Pro 기능 보기
          </button>
          <button
            type="button"
            onClick={onManageBilling}
            disabled={portalLoading}
            className="rounded-xl border border-amber-700/60 bg-amber-900/40 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-900/60 disabled:opacity-60"
          >
            {portalLoading ? "결제 관리 접속 중..." : "결제 관리"}
          </button>
        </div>
      </div>
    </section>
  );
}
