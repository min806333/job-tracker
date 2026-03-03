"use client";

import { useEffect, useMemo, useState } from "react";

import type { DashboardController } from "../hooks/useDashboardController";
import { AppCard } from "../common/AppCard";
import { track } from "@/lib/analytics/track";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeader } from "@/components/common/SectionHeader";

type KpiCard = {
  key: string;
  label: string;
  value: string;
  hint: string;
};

export default function TodayTab({ c }: { c: DashboardController }) {
  const [laterOpen, setLaterOpen] = useState(false);
  const [showAllKpi, setShowAllKpi] = useState(false);

  const nowItems = c.todayNowVisible ?? c.queueVisible ?? [];
  const nowCount = c.todayNowItems?.length ?? c.actionQueue.length;
  const laterItems = c.todayLaterItems ?? [];
  const laterCount = laterItems.length;

  const kpis = useMemo<KpiCard[]>(() => {
    return [
      {
        key: "now",
        label: "지금 처리",
        value: `${nowCount}건`,
        hint: "오늘 우선순위",
      },
      {
        key: "deadline",
        label: "이번 주 마감",
        value: `${c.kpi.weekDeadlineCount}건`,
        hint: "늦기 전에 체크",
      },
      {
        key: "followup",
        label: "이번 주 팔로업",
        value: `${c.kpi.weekFollowupCount}건`,
        hint: "응답 타이밍 관리",
      },
      {
        key: "due7",
        label: "7일 내 마감",
        value: `${c.kpi.due7}건`,
        hint: "중요 일정",
      },
      {
        key: "followup7",
        label: "7일 내 팔로업",
        value: `${c.kpi.followup7}건`,
        hint: "후속 액션",
      },
    ];
  }, [c.kpi, nowCount]);

  useEffect(() => {
    const rangeKey = `${c.todayWindowDays}d` as "3d" | "7d";
    const viewedKey = `evt_today_section_viewed_${rangeKey}`;
    try {
      if (sessionStorage.getItem(viewedKey) === "1") return;
      sessionStorage.setItem(viewedKey, "1");
    } catch {}

    void track("today_section_viewed", {
      range: rangeKey,
      now_count: nowCount,
      later_count: laterCount,
    });
  }, [c.todayWindowDays, nowCount, laterCount]);

  function handleToggleLater() {
    const next = !laterOpen;
    setLaterOpen(next);
    void track("later_section_toggled", {
      opened: next,
      later_count: laterCount,
    });
  }

  return (
    <section className="mt-5 space-y-4 sm:mt-6 sm:space-y-6">
      {c.apps.length === 0 ? (
        <EmptyState
          size="sm"
          title="아직 등록된 항목이 없어요"
          description="회사/직무를 먼저 추가하면 시스템이 오늘 해야 할 일을 자동으로 정리해줘요."
          primary={{ label: "빠른 추가", onClick: () => c.setQuickOpen(true) }}
        />
      ) : null}

      <section data-testid="today-now-section" className="order-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
        <SectionHeader
          size="sm"
          title={`지금 처리 ${nowCount}건`}
          subtitle="지금 대응이 필요한 항목부터 자동으로 정렬해 보여줘요."
        />

        {nowCount === 0 ? (
          <div className="mt-4">
            <EmptyState
              size="sm"
              title="오늘 처리할 항목이 없어요."
              primary={{ label: "빠른 추가", onClick: () => c.setQuickOpen(true) }}
              secondary={{ label: "전체 보기", onClick: () => c.setViewMode("LIST") }}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {nowItems.map((a) => (
              <AppCard
                key={`now-${a.id}`}
                a={a}
                pinned={c.pinnedSet.has(a.id)}
                busy={c.busyId === a.id}
                contextLabel="지금 처리"
                onOpenDetails={c.openDetails}
                onDone={c.markDone}
                onPostpone={c.postponeFollowup}
                onStageChange={c.updateStage}
                onDelete={c.scheduleDelete}
                onTogglePin={c.togglePin}
              />
            ))}
          </div>
        )}
      </section>

      <section className="order-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
        <SectionHeader
          size="sm"
          title="빠른 추가"
          subtitle="핵심 행동은 한 번 탭으로 처리하고, 요약/설정은 보조 액션으로 정리했어요."
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          {kpis.map((item, index) => {
            const hiddenOnMobile = index >= 4 && !showAllKpi;
            return (
              <article
                key={item.key}
                className={[
                  "rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 min-h-[92px]",
                  hiddenOnMobile ? "hidden sm:block" : "",
                ].join(" ")}
              >
                <div className="text-[11px] text-zinc-400">{item.label}</div>
                <div className="mt-1 text-lg font-semibold leading-none text-zinc-100">{item.value}</div>
                <div className="mt-2 text-[11px] text-zinc-500">{item.hint}</div>
              </article>
            );
          })}
        </div>

        {kpis.length > 4 ? (
          <button
            type="button"
            onClick={() => setShowAllKpi((prev) => !prev)}
            className="mt-3 inline-flex rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300 sm:hidden"
          >
            {showAllKpi ? "KPI 접기" : `KPI 더 보기 (${kpis.length - 4})`}
          </button>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/50 p-1">
            <button
              type="button"
              onClick={() => c.setTodayWindowDays(3)}
              className={[
                "rounded-lg px-3 py-1.5 text-xs transition",
                c.todayWindowDays === 3
                  ? "bg-emerald-950/40 text-emerald-200"
                  : "text-zinc-300 hover:bg-zinc-800/80",
              ].join(" ")}
            >
              3일
            </button>
            <button
              type="button"
              onClick={() => c.setTodayWindowDays(7)}
              className={[
                "rounded-lg px-3 py-1.5 text-xs transition",
                c.todayWindowDays === 7
                  ? "bg-emerald-950/40 text-emerald-200"
                  : "text-zinc-300 hover:bg-zinc-800/80",
              ].join(" ")}
            >
              7일
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              ref={c.quickAddBtnRef}
              data-testid="today-quick-add-button"
              onClick={() => c.setQuickOpen((v) => !v)}
              className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-sm font-medium text-emerald-200"
            >
              빠른 추가
            </button>

            <button
              type="button"
              onClick={c.copyWeeklySummary}
              className="hidden rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 sm:inline-flex"
            >
              이번 주 요약
            </button>

            <details className="relative sm:hidden">
              <summary className="flex h-10 w-10 list-none items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/60 text-zinc-300">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                <button
                  type="button"
                  onClick={c.copyWeeklySummary}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  이번 주 요약
                </button>
              </div>
            </details>
          </div>
        </div>

        {c.quickOpen ? (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">빠른 추가</div>
                <div className="mt-1 text-xs text-zinc-500">회사/직무만 먼저 저장하고 상세 정보는 나중에 채워도 됩니다.</div>
              </div>
              <button
                type="button"
                onClick={c.goToAddForm}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-200"
              >
                전체 입력으로
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-600"
                placeholder="회사명(필수)"
                value={c.quickCompany}
                onChange={(e) => c.setQuickCompany(e.target.value)}
                disabled={c.quickBusy}
              />
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-600"
                placeholder="직무/포지션(필수)"
                value={c.quickRole}
                onChange={(e) => c.setQuickRole(e.target.value)}
                disabled={c.quickBusy}
              />
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-600"
                placeholder="URL(선택)"
                value={c.quickUrl}
                onChange={(e) => c.setQuickUrl(e.target.value)}
                disabled={c.quickBusy}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={c.addQuick}
                disabled={c.quickBusy}
                className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-200 disabled:opacity-50"
              >
                {c.quickBusy ? "추가 중..." : "추가"}
              </button>
              <button
                type="button"
                onClick={() => c.setQuickOpen(false)}
                className="rounded-xl bg-zinc-800 px-4 py-2 text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="order-3 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4 sm:p-5">
        <SectionHeader
          size="sm"
          title={`나중에 처리 ${laterCount}건`}
          subtitle="당장 급하지 않은 항목은 기본 접힘으로 두고 필요할 때 확인하세요."
          right={
            <button
              type="button"
              onClick={handleToggleLater}
              className="rounded-xl border border-zinc-700 bg-zinc-800/70 px-3 py-2 text-xs text-zinc-300 sm:text-sm"
            >
              {laterOpen ? "접기" : "펼치기"}
            </button>
          }
        />

        <div
          className={[
            "overflow-hidden transition-all duration-200",
            laterOpen ? "mt-4 max-h-[1600px] opacity-100" : "max-h-0 opacity-0",
          ].join(" ")}
        >
          {laterCount === 0 ? (
            <div className="text-sm text-zinc-400">지금은 나중에 처리할 항목이 없어요.</div>
          ) : (
            <div className="space-y-3">
              {laterItems.map((a) => (
                <AppCard
                  key={`later-${a.id}`}
                  a={a}
                  pinned={c.pinnedSet.has(a.id)}
                  busy={c.busyId === a.id}
                  contextLabel="나중에 처리"
                  onOpenDetails={c.openDetails}
                  onDone={c.markDone}
                  onPostpone={c.postponeFollowup}
                  onStageChange={c.updateStage}
                  onDelete={c.scheduleDelete}
                  onTogglePin={c.togglePin}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

