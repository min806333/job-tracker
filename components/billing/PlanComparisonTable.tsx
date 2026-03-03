"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/track";

type PlanType = "free" | "pro" | "grace";
type Variant = "full" | "compact";
type ComparisonPage = "plan" | "paywall" | "grace";

type PlanComparisonTableProps = {
  currentPlan: PlanType;
  freeMaxApps?: number;
  onUpgrade?: () => void;
  onManageBilling?: () => void;
  variant?: Variant;
};

type FeatureRow = {
  label: string;
  free: string;
  pro: string;
};

function resolvePage(pathname: string, currentPlan: PlanType): ComparisonPage {
  if (pathname.startsWith("/dashboard/plan")) return "plan";
  if (currentPlan === "grace") return "grace";
  return "paywall";
}

export default function PlanComparisonTable({
  currentPlan,
  freeMaxApps = 100,
  onUpgrade,
  onManageBilling,
  variant = "full",
}: PlanComparisonTableProps) {
  const pathname = usePathname();
  const page = resolvePage(pathname, currentPlan);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackedRef = useRef(false);
  const showCta = variant === "full" && (onUpgrade || onManageBilling);

  const rows = useMemo<FeatureRow[]>(
    () => [
      {
        label: "지원서 저장 개수",
        free: `최대 ${freeMaxApps}개`,
        pro: "무제한",
      },
      {
        label: "우선순위 / Focus Top3",
        free: "핵심 카드 중심으로 기본 관리",
        pro: "Top3 우선순위 집중 관리",
      },
      {
        label: "마감 / 팔로업 관리",
        free: "기본 일정 기록/수정",
        pro: "정렬/필터 중심의 빠른 정리",
      },
      {
        label: "캘린더 / 리마인드",
        free: "기본 캘린더 표시",
        pro: "필터 기반으로 일정 정리 강화",
      },
      {
        label: "내보내기 / 백업",
        free: "CSV 내보내기",
        pro: "CSV 내보내기 + 대량 관리에 유리",
      },
      {
        label: "결제 유예(Grace) 상태",
        free: "한도에 도달하면 추가 저장 제한",
        pro: "결제 확인 후 Pro 기능 즉시 복구 (데이터 안전 보존)",
      },
    ],
    [freeMaxApps]
  );

  useEffect(() => {
    const node = rootRef.current;
    if (!node || trackedRef.current) return;

    const key = `evt_plan_comparison_viewed_${variant}_${page}`;
    try {
      if (sessionStorage.getItem(key) === "1") {
        trackedRef.current = true;
        return;
      }
    } catch {}

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || trackedRef.current) return;
        trackedRef.current = true;
        try {
          sessionStorage.setItem(key, "1");
        } catch {}
        void track("plan_comparison_viewed", { variant, page });
        observer.disconnect();
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [page, variant]);

  function handleCtaClick(action: "upgrade" | "manage", handler?: () => void) {
    void track("plan_comparison_cta_clicked", { action, from: page });
    handler?.();
  }

  const freeBadge = currentPlan === "free" ? "현재 사용중" : null;
  const proBadge = currentPlan === "pro" ? "현재 사용중" : currentPlan === "grace" ? "현재 사용중(유예)" : null;

  return (
    <section ref={rootRef} className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="border-b border-zinc-800 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 sm:text-lg">Free vs Pro 비교</h2>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">현재 플랜과 업그레이드 가치를 한눈에 확인하세요.</p>
          </div>
          {currentPlan === "grace" ? (
            <span className="rounded-full border border-amber-700/60 bg-amber-900/30 px-2.5 py-1 text-[11px] font-medium text-amber-200">
              Grace 상태
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:p-5 md:hidden">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100">Free</h3>
            {freeBadge ? (
              <span className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-200">
                {freeBadge}
              </span>
            ) : null}
          </div>
          <ul className="space-y-2 text-sm text-zinc-300">
            {rows.map((row) => (
              <li key={`m-free-${row.label}`}>
                <p className="text-xs text-zinc-500">{row.label}</p>
                <p>{row.free}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-100">Pro</h3>
            {proBadge ? (
              <span className="rounded-full border border-emerald-700/60 bg-emerald-900/40 px-2 py-0.5 text-[11px] text-emerald-100">
                {proBadge}
              </span>
            ) : null}
          </div>
          <ul className="space-y-2 text-sm text-zinc-200">
            {rows.map((row) => (
              <li key={`m-pro-${row.label}`}>
                <p className="text-xs text-zinc-400">{row.label}</p>
                <p>{row.pro}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="hidden md:block">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="border-b border-zinc-800 px-5 py-3 text-left text-xs font-medium text-zinc-400">항목</th>
              <th className="border-b border-zinc-800 px-5 py-3 text-left">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  Free
                  {freeBadge ? (
                    <span className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-[11px] font-normal text-zinc-200">
                      {freeBadge}
                    </span>
                  ) : null}
                </div>
              </th>
              <th className="border-b border-emerald-800/50 bg-emerald-950/15 px-5 py-3 text-left">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  Pro
                  {proBadge ? (
                    <span className="rounded-full border border-emerald-700/60 bg-emerald-900/40 px-2 py-0.5 text-[11px] font-normal text-emerald-100">
                      {proBadge}
                    </span>
                  ) : null}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="border-b border-zinc-900 px-5 py-3 text-sm text-zinc-400">{row.label}</td>
                <td className="border-b border-zinc-900 px-5 py-3 text-sm text-zinc-200">{row.free}</td>
                <td className="border-b border-emerald-950/40 bg-emerald-950/15 px-5 py-3 text-sm text-zinc-100">{row.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCta ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 px-4 py-4 sm:px-5">
          {onUpgrade ? (
            <button
              type="button"
              onClick={() => handleCtaClick("upgrade", onUpgrade)}
              className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-950/40"
            >
              Pro로 업그레이드
            </button>
          ) : null}
          {onManageBilling ? (
            <button
              type="button"
              onClick={() => handleCtaClick("manage", onManageBilling)}
              className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800/60"
            >
              결제 관리
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
